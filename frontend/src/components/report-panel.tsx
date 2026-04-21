import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  report: string;
}

export const ReportPanel = ({ report }: Props) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
        Report
      </h3>
      <div className="space-y-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full text-sm border-collapse">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-gray-700">{children}</thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-gray-800 last:border-0">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="text-gray-200 px-3 py-2">{children}</td>
            ),
            p: ({ children }) => (
              <p className="text-gray-200 text-sm leading-relaxed mb-4 last:mb-0">
                {children}
              </p>
            ),
            h1: ({ children }) => (
              <h1 className="text-white text-lg font-semibold mt-6 mb-3 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-white text-base font-semibold mt-5 mb-2 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-gray-100 text-sm font-semibold mt-4 mb-2 first:mt-0">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside pl-5 space-y-1 mb-4 text-gray-200 text-sm">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside pl-5 space-y-1 mb-4 text-gray-200 text-sm">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="text-gray-300 italic">{children}</em>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-gray-600 pl-4 my-4 text-gray-400 italic text-sm">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="border-gray-700 my-5" />,
            code: ({ children }) => (
              <code className="bg-gray-800 text-gray-300 text-xs px-1.5 py-0.5 rounded font-mono">
                {children}
              </code>
            ),
          }}
        >
          {report}
        </ReactMarkdown>
      </div>
    </div>
  );
};
