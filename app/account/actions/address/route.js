import {NextResponse} from 'next/server';
import {customerAccountConfig,queryCustomerAccount,readAccountSession,sessionExpired} from '../../../../lib/customer-account.js';
import {reserveAccountBurst,sameOriginRequest} from '../../../../lib/request-security.js';
import {assertAllowedFormKeys,readLimitedForm} from '../../../../lib/request-body.js';

const createMutation=`mutation AXAddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
  customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
    customerAddress { id formatted(withName: true, withCompany: true) }
    userErrors { field message }
  }
}`;
const updateMutation=`mutation AXAddressUpdate($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
  customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
    customerAddress { id formatted(withName: true, withCompany: true) }
    userErrors { field message }
  }
}`;
const addressOwnershipQuery=`query AXAddressOwnership {
  customer { addresses(first: 100) { nodes { id } } }
}`;
const deleteMutation=`mutation AXAddressDelete($addressId: ID!) {
  customerAddressDelete(addressId: $addressId) {
    deletedAddressId
    userErrors { field message }
  }
}`;

function redirect(request,status) {
  const url=new URL('/account',request.url);
  url.searchParams.set('status',status);
  url.hash='addresses';
  return NextResponse.redirect(url,303);
}
function safeText(value,max=120) { return String(value || '').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max); }
function validAddressId(value) { return /^gid:\/\/shopify\/CustomerAddress\/[A-Za-z0-9_-]+$/.test(String(value || '')); }
async function ownsAddress(config,session,addressId) {
  const result=await queryCustomerAccount(config,session,addressOwnershipQuery);
  return Boolean(result.data?.customer?.addresses?.nodes?.some(address=>address?.id===addressId));
}
function addressInput(form) {
  return {
    firstName:safeText(form.get('firstName'),80),
    lastName:safeText(form.get('lastName'),80),
    company:safeText(form.get('company'),120),
    address1:safeText(form.get('address1'),160),
    address2:safeText(form.get('address2'),160),
    city:safeText(form.get('city'),100),
    zoneCode:safeText(form.get('zoneCode'),10).toUpperCase(),
    territoryCode:safeText(form.get('territoryCode'),2).toUpperCase(),
    zip:safeText(form.get('zip'),20),
    phoneNumber:safeText(form.get('phoneNumber'),30)
  };
}

export async function POST(request) {
  const config=customerAccountConfig();
  if(!config.enabled) return redirect(request,'unavailable');
  if(!sameOriginRequest(request,config.siteOrigin)) return new NextResponse('Forbidden',{status:403});
  const session=readAccountSession(request,config);
  if(!session) return redirect(request,'signin');
  if(sessionExpired(session)) {
    const url=new URL('/account/refresh',request.url);
    url.searchParams.set('returnTo','/account#addresses');
    return NextResponse.redirect(url,303);
  }
  const burst=reserveAccountBurst(request);
  if(!burst.allowed) return new NextResponse('Too many account changes. Please try again shortly.',{status:429,headers:{'Retry-After':String(burst.retryAfter)}});

  let form;
  try{
    form=assertAllowedFormKeys(await readLimitedForm(request,12288),[
      'intent','addressId','firstName','lastName','company','address1','address2',
      'city','zoneCode','territoryCode','zip','phoneNumber','defaultAddress'
    ]);
  }catch{return redirect(request,'address-error');}
  const intent=String(form.get('intent') || '');
  try {
    if(intent==='delete') {
      const addressId=String(form.get('addressId') || '');
      if(!validAddressId(addressId) || !(await ownsAddress(config,session,addressId))) return redirect(request,'address-error');
      const result=await queryCustomerAccount(config,session,deleteMutation,{addressId});
      const payload=result.data?.customerAddressDelete;
      if(!payload || payload.userErrors?.length) return redirect(request,'address-error');
      return redirect(request,'address-deleted');
    }

    const address=addressInput(form),makeDefault=form.get('defaultAddress')==='on';
    if(!address.address1 || !address.city || !/^[A-Z]{2}$/.test(address.territoryCode)) return redirect(request,'address-error');
    if(intent==='create') {
      const result=await queryCustomerAccount(config,session,createMutation,{address,defaultAddress:makeDefault});
      const payload=result.data?.customerAddressCreate;
      if(!payload || payload.userErrors?.length) return redirect(request,'address-error');
      return redirect(request,'address-saved');
    }
    if(intent==='update') {
      const addressId=String(form.get('addressId') || '');
      if(!validAddressId(addressId) || !(await ownsAddress(config,session,addressId))) return redirect(request,'address-error');
      const result=await queryCustomerAccount(config,session,updateMutation,{addressId,address,defaultAddress:makeDefault ? true : null});
      const payload=result.data?.customerAddressUpdate;
      if(!payload || payload.userErrors?.length) return redirect(request,'address-error');
      return redirect(request,'address-saved');
    }
    return redirect(request,'address-error');
  } catch {
    return redirect(request,'address-error');
  }
}
