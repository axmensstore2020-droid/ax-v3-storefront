export const PARTIAL_COD_RATE=0.20;
export const PARTIAL_COD_HANDLING_MIN_INR=40;
export const PARTIAL_COD_HANDLING_RATE=0.02;

function toPaise(value){
 const amount=Number(value);
 if(!Number.isFinite(amount) || amount<=0) return 0;
 return Math.round(amount*100);
}

export function partialCodHandlingFee(productBillValue){
 const billPaise=toPaise(productBillValue);
 if(!billPaise) return 0;
 const minimumPaise=PARTIAL_COD_HANDLING_MIN_INR*100;
 const percentagePaise=Math.round(billPaise*PARTIAL_COD_HANDLING_RATE);
 return Math.max(minimumPaise,percentagePaise)/100;
}

export function partialCodAdvance(orderTotal){
 const totalPaise=toPaise(orderTotal);
 if(!totalPaise) return 0;
 const advancePaise=Math.min(totalPaise,Math.round(totalPaise*PARTIAL_COD_RATE));
 return advancePaise/100;
}

export function partialCodBreakdown(orderTotal){
 const totalPaise=toPaise(orderTotal);
 if(!totalPaise) return {orderTotal:0,advance:0,codBalance:0};
 const advancePaise=Math.round(partialCodAdvance(totalPaise/100)*100);
 return {
  orderTotal:totalPaise/100,
  advance:advancePaise/100,
  codBalance:Math.max(0,totalPaise-advancePaise)/100
 };
}
