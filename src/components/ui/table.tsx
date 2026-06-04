import React from "react";

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ className = "", ...props }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-orange-100 shadow-sm">
    <table className={`w-full caption-bottom text-sm border-collapse ${className}`} {...props} />
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = "", ...props }) => (
  <thead className={`border-b border-orange-100 bg-orange-50/60 ${className}`} {...props} />
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ className = "", ...props }) => (
  <tbody className={`divide-y divide-orange-50 bg-white ${className}`} {...props} />
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = "", ...props }) => (
  <tr
    className={`transition-colors hover:bg-orange-50/20 data-[state=selected]:bg-orange-50 ${className}`}
    {...props}
  />
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = "", ...props }) => (
  <th
    className={`h-12 px-4 text-left align-middle font-bold text-orange-900 [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = "", ...props }) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700 ${className}`} {...props} />
);
