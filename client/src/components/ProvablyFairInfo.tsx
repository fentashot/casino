import { SpinResponse } from '@server/types';

type Props = {
  spinData: SpinResponse | null;
};

/**
 * Komponent wyświetlający informacje Provably Fair dla ostatniego spinu
 */
export function ProvablyFairInfo({ spinData }: Props) {
  return (
    <div className="bg-zinc-800/30 p-4 rounded-lg">
      <h3 className="font-semibold text-lg mb-3">Provably Fair</h3>

      {spinData ? (
        <div className="space-y-1 text-sm text-zinc-400">
          <InfoRow
            label="Numer"
            value={spinData.result.number}
            valueClassName="text-white font-mono"
          />
          <InfoRow
            label="Stawka"
            value={`${spinData.totalBet.toLocaleString('pl-PL')} zł`}
            valueClassName="text-white"
          />
          <InfoRow
            label="Wygrana"
            value={`${spinData.totalWin.toLocaleString('pl-PL')} zł`}
            valueClassName={spinData.totalWin > 0 ? 'text-green-400' : 'text-red-400'}
          />

          <div className="pt-2" />

          <InfoRow
            label="Client Seed"
            value={spinData.provablyFair.clientSeed}
            valueClassName="font-mono text-xs break-all"
          />
          <InfoRow
            label="Server Seed Hash"
            value={spinData.provablyFair.serverSeedHash}
            valueClassName="font-mono text-xs break-all"
          />
          <InfoRow
            label="Nonce"
            value={spinData.provablyFair.nonce}
            valueClassName="font-mono"
          />
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">Zagraj, żeby zobaczyć dane</p>
      )}
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string | number;
  valueClassName?: string;
};

function InfoRow({ label, value, valueClassName = '' }: InfoRowProps) {
  return (
    <p>
      {label}: <span className={valueClassName}>{value}</span>
    </p>
  );
}
