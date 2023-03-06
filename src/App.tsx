import { WsProvider, ApiPromise } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatBalance } from "@polkadot/ui-util";
import BN from "bn.js";
import { ChangeEvent, useEffect, useState } from "react";

const NAME = "GMorDie";

type Period = "MORNING" | "NIGHT" | "MIDONE" | "MIDTWO";

const AMOUNT = new BN(10).mul(new BN(10).pow(new BN(12)));

const App = () => {
  const [api, setApi] = useState<ApiPromise>();
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InjectedAccountWithMeta>();
  const [period, setPeriod] = useState<Period>();
  const [balance, setBalance] = useState<BN>();

  const setup = async () => {
    const wsProvider = new WsProvider("wss://ws.gm.bldnodes.org/");

    const api = await ApiPromise.create({ provider: wsProvider });

    setApi(api);
  };

  const handleConnection = async () => {
    const extensions = await web3Enable(NAME);

    if (!extensions) {
      throw Error("NO_EXTENSION_FOUND");
    }

    const allAccounts = await web3Accounts();

    setAccounts(allAccounts);

    if (allAccounts.length === 1) {
      setSelectedAccount(allAccounts[0]);
    }
  };

  const handleAccountSelection = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedAddress = e.target.value;

    const account = accounts.find(
      (account) => account.address === selectedAddress
    );

    if (!account) {
      throw Error("NO_ACCOUNT_FOUND");
    }

    setSelectedAccount(account);
  };

  const handleBurn = async () => {
    if (!api) return;

    if (!selectedAccount) return;

    const injector = await web3FromAddress(selectedAccount.address);

    await api.tx.currencies
      .burnFren(AMOUNT)
      .signAndSend(selectedAccount.address, {
        signer: injector.signer,
      });
  };

  useEffect(() => {
    setup();
  }, []);

  useEffect(() => {
    if (!api) return;

    (async () => {
      const period = (
        await api.query.currencies.currentTimePeriod()
      ).toPrimitive() as string;

      const parsedPeriod = period.toUpperCase() as Period;

      setPeriod(parsedPeriod);
    })();
  }, [api]);

  useEffect(() => {
    if (!api) return;

    if (!selectedAccount) return;

    api.query.system.account(
      selectedAccount.address,
      ({ data: { free } }: { data: { free: BN } }) => {
        setBalance(free);
      }
    );
  }, [api, selectedAccount]);

  return (
    <div className="bg-neutral-100 flex items-center justify-center h-[100svh]">
      {accounts.length === 0 ? (
        <button
          onClick={handleConnection}
          className="rounded-md px-4 py-2 bg-neutral-800 text-white"
        >
          Connect
        </button>
      ) : null}

      {accounts.length > 0 && !selectedAccount ? (
        <>
          <select onChange={handleAccountSelection} className="rounded-md">
            <option value="" disabled selected hidden key="nothing">
              Choose your account
            </option>
            {accounts.map((account) => (
              <option value={account.address} key={account.address}>
                {account.meta.name || account.address}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {selectedAccount ? (
        <div className="p-8 rounded-md shadow-lg flex flex-col gap-4">
          {period ? (
            <>
              <div>We are on the {period} period. </div>

              <div>
                {period === "MORNING" ? "You'll earn GM" : null}
                {period === "NIGHT" ? "You'll earn GN" : null}
                {period === "MIDONE" || period === "MIDTWO"
                  ? "You'll just burn the tokens"
                  : null}
              </div>
            </>
          ) : null}

          <span>
            BALANCE:{" "}
            {formatBalance(balance, {
              withUnit: "FREN",
            })}
          </span>

          <button
            onClick={handleBurn}
            className="rounded-md px-4 py-2 bg-neutral-800 text-white"
          >
            BURN 10 $FREN
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default App;
