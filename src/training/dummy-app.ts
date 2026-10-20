// Local response fixtures only. No hostname, login or application request is contacted.
export function dummyAppResponse(path: string, method: string, upstreamPath: string) {
  if (path === '/api/customerlookup/getbydob')
    return JSON.stringify({
      simulation: true,
      customer: 'SYNTHETIC PERSON',
      customerId: 'DEMO-C001',
      ssn: 'DEMO-NOT-REAL',
    });
  if (path === '/api/customerlookup/getbyname')
    return JSON.stringify({
      simulation: true,
      customers: [{ customerId: 'DEMO-C001', name: 'Demo Customer', status: 'active' }],
    });
  if (path === '/flight')
    return JSON.stringify({
      simulation: true,
      flights: [
        { flightNumber: 'DEMO101', from: 'ICN', to: 'NRT', seats: 42 },
        { flightNumber: 'DEMO202', from: 'ICN', to: 'SIN', seats: 18 },
      ],
    });
  if (path === '/user/vipsignin' || path === '/login')
    return JSON.stringify({
      simulation: true,
      message: 'Synthetic login accepted',
      user: 'demo-traveler',
      session: 'not-a-real-session',
    });
  if (path === '/qrcode/form')
    return JSON.stringify({
      simulation: true,
      application: 'Demo QR App',
      connector: 'synthetic-bigip-telemetry',
    });
  return JSON.stringify({
    simulation: true,
    application: 'XC Training App',
    method,
    path,
    upstreamPath,
    message: 'Local dummy origin response',
  });
}
