export async function onRequestError(error,request,context){
  const {reportServerError}=await import('./lib/error-monitoring.js');
  await reportServerError(error,{
    source:'next-request',
    path:request?.path || request?.url || '',
    routerKind:context?.routerKind || '',
    routeType:context?.routeType || '',
    routePath:context?.routePath || ''
  });
}
