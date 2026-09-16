const object = properties => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const tool = (name,description,properties) => ({type:'function',name,description,strict:true,parameters:object(properties)});
export const TOOLS = [
  tool('search_products','Search live AX products. Use short product/fabric/style terms. maxPrice is a per-item INR ceiling, not a whole-outfit budget.',{query:{type:'string'},maxPrice:{type:['number','null']}}),
  tool('get_product','Read a real AX product and its exact variants. Narrow selectedOptions to a known colour when moreVariants is true; null otherwise.',{handle:{type:'string'},selectedOptions:{type:['array','null'],items:object({name:{type:'string'},value:{type:'string'}})}}),
  tool('check_fit','Compare the customer-entered My fit measurements with an approved product body-size guide. Never invent measurements.',{handle:{type:'string'}}),
  tool('store_help','Read AX policies, stores, contact information or published pages.',{topic:{type:'string',enum:['policies','stores','contact','faqs','about','careers']}})
];

export const helpLabels = {policies:'Store policies',stores:'Stores & directions',contact:'Contact AX',faqs:'FAQs',about:'Our story',careers:'Careers'};
// Validate allowlisted, read-only actions independently of the model's schema.
export function validateTool(call) {
  const args = JSON.parse(call.arguments);
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid tool request.');
  const keys=Object.keys(args).sort().join(',');
  if (call.name==='search_products' && keys==='maxPrice,query' && typeof args.query==='string' && args.query.trim() && args.query.length<=180 && (args.maxPrice===null || (Number.isFinite(args.maxPrice)&&args.maxPrice>=0&&args.maxPrice<=1000000))) return args;
  if (['get_product','check_fit'].includes(call.name) && (keys==='handle' || (call.name==='get_product' && keys==='handle,selectedOptions')) && typeof args.handle==='string' && /^[a-z0-9][a-z0-9-]{0,179}$/.test(args.handle)) {
    if(args.selectedOptions!=null && (!Array.isArray(args.selectedOptions) || args.selectedOptions.length>3 || args.selectedOptions.some(o=>!o || Object.keys(o).sort().join(',')!=='name,value' || typeof o.name!=='string' || typeof o.value!=='string' || o.name.length>50 || o.value.length>70 || ['__proto__','constructor','prototype'].includes(o.name)))) throw new Error('Unsupported tool request.');
    return args;
  }
  if (call.name==='store_help' && keys==='topic' && Object.hasOwn(helpLabels,args.topic)) return args;
  throw new Error('Unsupported tool request.');
}
