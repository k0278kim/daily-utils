const formatDate = (d: Date | null) => {
  if (!d) return null;
  const y = d!.getFullYear();
  const m = String(d!.getMonth() + 1).padStart(2, "0");
  const day = String(d!.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default formatDate;