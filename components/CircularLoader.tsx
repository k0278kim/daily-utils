export default function CircularLoader() {
  return (
    <div className="flex justify-center items-center h-full">
      <div className={`w-full aspect-square border-3 border-[#afafaf] border-t-transparent rounded-full animate-spin`}></div>
    </div>
  );
}