export function ComparisonTable() {
  const rows = [
    { label: 'Monthly Book Limit', free: '2 Books', scholar: '15 Books', unlimited: 'No Limit' },
    { label: 'Translation Accuracy', free: 'Standard', scholar: 'High (Nuance™)', unlimited: 'Highest (Creative)' },
    { label: 'Cultural Idiom Support', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Device Sync', free: '1 Device', scholar: '3 Devices', unlimited: 'Unlimited' },
    { label: 'Export to e-Reader', free: '—', scholar: '✓', unlimited: '✓' },
    { label: 'Audio-Book Generation', free: '—', scholar: '—', unlimited: '✓' },
  ];

  return (
    <>
      <style>{`
        .comparison-table-scroll {
          margin-top: 40px;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .comparison-table th {
          text-align: center;
          padding: 24px 32px;
          background: #FAF9F7;
          font-family: 'Lora', serif;
          font-size: 18px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          font-weight: 400;
          color: var(--ink);
          width: 20%;
        }
        .comparison-table th:first-child {
          text-align: left;
          width: 40%;
        }
        .comparison-table th.comparison-table__scholar {
          color: var(--primary);
        }
        .comparison-table td {
          padding: 20px 32px;
          font-size: 15px;
          color: var(--ash);
          width: 20%;
          text-align: center;
        }
        .comparison-table td:first-child {
          color: var(--ink);
          font-weight: 500;
          width: 40%;
          text-align: left;
        }
        .comparison-table tbody tr:not(:last-child) td {
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        @media (max-width: 1023px) {
          .comparison-table th {
            padding: 20px 24px;
            font-size: 16px;
          }
          .comparison-table td {
            padding: 16px 24px;
            font-size: 14px;
          }
        }
        @media (max-width: 639px) {
          .comparison-table-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin-top: 24px;
          }
          .comparison-table {
            min-width: 540px;
          }
          .comparison-table th {
            padding: 12px 16px;
            font-size: 14px;
          }
          .comparison-table td {
            padding: 12px 16px;
            font-size: 13px;
          }
        }
      `}</style>
      <div className="comparison-table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Features</th>
              <th>Free</th>
              <th className="comparison-table__scholar">Scholar</th>
              <th>Unlimited</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td>{row.label}</td>
                <td>{row.free}</td>
                <td>{row.scholar}</td>
                <td>{row.unlimited}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
