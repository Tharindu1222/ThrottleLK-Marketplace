export function whatsappHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}
