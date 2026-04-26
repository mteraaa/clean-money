"use client";

import { useBalanceActions } from "./balance/useBalanceActions";
import TotalBalanceCard from "./balance/TotalBalanceCard";
import CollectiblesCard from "./balance/CollectiblesCard";
import CashOnHandCard from "./balance/CashOnHandCard";
import CashOnBankCard from "./balance/CashOnBankCard";
import CalculatorDialog from "./balance/CalculatorDialog";

type Props = {
  cashOnBank: number;
  cashOnHand: number;
  collectibles?: number;
  facultyCode?: string | null;
  campusCode?: string | null;
  isPublished?: boolean;
};

export default function BalanceCards({ isPublished = false, ...rest }: Props) {
  const {
    visible, setVisible,
    bank, hand, coll,
    prevColl, prevBank,
    bankAction, setBankAction,
    calcOpen, calcInput, calcSaving,
    openCalc, closeCalc,
    handleUndoColl, handleUndoBank,
    handleCalcKey, confirmCalc,
  } = useBalanceActions(rest);

  return (
    <>
      <div className="flex gap-4 font-lexend">
        <TotalBalanceCard
          total={bank + hand}
          visible={visible}
          onToggle={() => setVisible((v) => !v)}
        />

        <div className="flex gap-2 w-2/4">
          <div className="flex flex-col gap-4 flex-1">
            <CollectiblesCard
              coll={coll}
              visible={visible}
              isPublished={isPublished}
              canUndo={prevColl !== null}
              onUndo={handleUndoColl}
              onAdd={() => openCalc("collectibles_add")}
            />
            <CashOnHandCard hand={hand} visible={visible} />
          </div>

          <CashOnBankCard
            bank={bank}
            visible={visible}
            isPublished={isPublished}
            canUndo={prevBank !== null}
            onUndo={handleUndoBank}
            onDeposit={() => openCalc("deposit")}
            onWithdrawal={() => openCalc("withdrawal")}
          />
        </div>
      </div>

      <CalculatorDialog
        open={calcOpen}
        bankAction={bankAction}
        calcInput={calcInput}
        calcSaving={calcSaving}
        onClose={closeCalc}
        onBankActionChange={(action) => { setBankAction(action); }}
        onCalcKey={handleCalcKey}
        onConfirm={confirmCalc}
      />
    </>
  );
}
