export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('0')) local = `94${local.slice(1)}`;
  else if (!local.startsWith('94')) local = `94${local}`;
  return `https://wa.me/${local}`;
}
