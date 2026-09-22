import test from 'node:test';
import assert from 'node:assert/strict';
import {cartOwnerCookie,ownsCartToken,requestOwnsCart,sealCartOwnership} from '../lib/cart-session.js';

const secret='cart-session-secret-that-is-longer-than-32-characters';
const cart='gid://shopify/Cart/abc?key=secret';

test('cart ownership tokens bind one opaque Shopify cart to one browser session',()=>{
  const token=sealCartOwnership(cart,secret,1000);
  assert.equal(ownsCartToken(token,cart,secret,1001),true);
  assert.equal(ownsCartToken(token,'gid://shopify/Cart/other',secret,1001),false);
  assert.equal(ownsCartToken(token+'x',cart,secret,1001),false);
});

test('cart ownership expires and request checks use the signed HttpOnly cookie value',()=>{
  const now=Date.now(),token=sealCartOwnership(cart,secret,now);
  assert.equal(ownsCartToken(token,cart,secret,now+31*24*60*60*1000),false);
  const request=new Request('https://axstore.in/api/cart',{headers:{cookie:'ax_cart_owner='+token}});
  assert.equal(requestOwnsCart(request,cart,{AX_CART_SESSION_SECRET:secret}),true);
  assert.ok(cartOwnerCookie(cart,{AX_CART_SESSION_SECRET:secret}));
});

test('cart ownership fails closed when the server secret is missing',()=>{
  const request=new Request('https://axstore.in/api/cart');
  assert.equal(requestOwnsCart(request,cart,{}),false);
});
