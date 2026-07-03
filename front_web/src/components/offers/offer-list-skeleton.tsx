export function OfferListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          <td className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="animate-pulse w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
              <div>
                <div className="animate-pulse w-35 h-3 rounded bg-gray-100 mb-1.5" />
                <div className="animate-pulse w-22.5 h-2.5 rounded bg-gray-100" />
              </div>
            </div>
          </td>
          {[100, 80, 90, 80, 80, 60].map((width, j) => (
            <td key={j} className="p-3.5">
              <div 
                className="animate-pulse h-3 rounded bg-gray-100" 
                style={{ width: `${width}px` }} 
              />
            </td>
          ))}
          <td className="p-3.5">
            <div className="animate-pulse w-7.5 h-7.5 rounded-md bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}