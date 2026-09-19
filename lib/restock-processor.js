import 'server-only';

function safeError(error){
  return String(error?.message||'Processing failed.').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,500);
}

export async function processRestockSubscriptions({
  database,getProduct,sendEmail,env=process.env,limit=25,now=new Date()
}){
  const rows=await database.listPendingRestockSubscriptions(limit,now);
  const summary={checked:rows.length,waiting:0,notified:0,cancelled:0,expired:0,failed:0};
  const products=new Map();

  for(const subscription of rows){
    try{
      const expiresAt=Date.parse(subscription.expires_at||'');
      if(Number.isFinite(expiresAt) && expiresAt<=now.getTime()){
        await database.closeRestockSubscription(subscription.id,'expired');
        summary.expired+=1;
        continue;
      }
      let product=products.get(subscription.product_handle);
      if(product===undefined){
        product=await getProduct(subscription.product_handle);
        products.set(subscription.product_handle,product||null);
      }
      if(!product || product.demo){
        await database.closeRestockSubscription(subscription.id,'cancelled');
        summary.cancelled+=1;
        continue;
      }
      const variant=(product.variants||[]).find(item=>item?.id===subscription.variant_id);
      if(!variant){
        await database.closeRestockSubscription(subscription.id,'cancelled');
        summary.cancelled+=1;
        continue;
      }
      if(variant.availableForSale!==true){
        summary.waiting+=1;
        continue;
      }
      const sent=await sendEmail({subscription,product,variant},env);
      await database.markRestockNotified(subscription.id,sent.id);
      summary.notified+=1;
    }catch(error){
      await database.markRestockAttempt(subscription.id,(Number(subscription.attempt_count)||0)+1,safeError(error)).catch(()=>{});
      summary.failed+=1;
    }
  }
  return summary;
}
