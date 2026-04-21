import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  code: string;
}

export const CodePanel = ({ code }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-900 hover:bg-gray-800/80 transition-colors text-left"
      >
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Simulation Code
        </span>
        <span className="text-gray-500 text-xs">
          {open ? "▲ Hide" : "▼ Show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-800 text-sm">
          <SyntaxHighlighter
            language="javascript"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              background: "#0f172a",
              padding: "1.25rem",
              fontSize: "0.8rem",
              lineHeight: "1.6",
            }}
            wrapLongLines={false}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
};
