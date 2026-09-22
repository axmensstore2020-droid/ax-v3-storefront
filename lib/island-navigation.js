export const AX_ISLAND_SLOT_COUNT=5;

export function islandSlotX(width,index,beadWidth=72,slotCount=AX_ISLAND_SLOT_COUNT){
 const safeWidth=Number(width),safeBead=Number(beadWidth);
 if(!Number.isFinite(safeWidth) || safeWidth<=0 || !Number.isFinite(safeBead) || safeBead<=0) return 0;
 const count=Math.max(1,Math.trunc(Number(slotCount)||AX_ISLAND_SLOT_COUNT));
 const safeIndex=Math.min(count-1,Math.max(0,Math.trunc(Number(index)||0)));
 const slot=safeWidth/count;
 return slot*(safeIndex+.5)-safeBead/2;
}

export function nearestIslandIndex(width,x,beadWidth=72,slotCount=AX_ISLAND_SLOT_COUNT){
 const safeWidth=Number(width),safeX=Number(x),safeBead=Number(beadWidth);
 if(!Number.isFinite(safeWidth) || safeWidth<=0 || !Number.isFinite(safeX) || !Number.isFinite(safeBead)) return 0;
 const count=Math.max(1,Math.trunc(Number(slotCount)||AX_ISLAND_SLOT_COUNT));
 const slot=safeWidth/count;
 const center=safeX+safeBead/2;
 return Math.min(count-1,Math.max(0,Math.round(center/slot-.5)));
}
