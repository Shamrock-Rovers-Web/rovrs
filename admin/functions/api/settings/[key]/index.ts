function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestGet: PagesFunction = async (context) => {
  return json({ success: false, error: 'Settings not yet implemented' }, 501);
};

export const onRequestPut: PagesFunction = async (context) => {
  return json({ success: false, error: 'Settings not yet implemented' }, 501);
};
