interface Props {
  report: string;
}

export const ReportPanel = ({ report }: Props) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Report
      </h3>
      <div className="prose prose-sm prose-invert max-w-none">
        {report.split("\n").map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-3" />
          ) : (
            <p key={i} className="text-gray-200 text-sm leading-relaxed">
              {line}
            </p>
          ),
        )}
      </div>
    </div>
  );
};
