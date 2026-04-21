export const LoadingView = () => {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">Running simulation…</p>
      <p className="text-xs text-gray-600">This may take a minute.</p>
    </div>
  );
};
