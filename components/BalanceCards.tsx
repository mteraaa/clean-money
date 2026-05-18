"use client";

import { useEffect } from "react";
import { useBalanceActions } from "./balance/useBalanceActions";
import TotalBalanceCard from "./balance/TotalBalanceCard";
import CollectiblesCard from "./balance/CollectiblesCard";
import CashOnHandCard from "./balance/CashOnHandCard";
import CashOnBankCard from "./balance/CashOnBankCard";
import FinesCard from "./balance/FinesCard";
import CalculatorDialog from "./balance/CalculatorDialog";
import FineEditDialog from "./balance/FineEditDialog";

type Props = {
  cashOnBank: number;
  cashOnHand: number;
  collectibles?: number;
  fineAmount?: number;
  totalStudentsWithFines?: number;
  fineStudentsPaid?: number;
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
    fineAmt, totalFineStudents,
    fineEditOpen, fineAmtInput, fineTotalInput, fineSaving,
    finesAdded,
    openFineEdit, closeFineEdit,
    setFineAmtInput, setFineTotalInput,
    saveFineEdit,
    handleAddFineToCollectibles,
  } = useBalanceActions(rest);

  useEffect(() => {
    if (!calcOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); handleCalcKey(e.key); }
      else if (e.key === ".") { e.preventDefault(); handleCalcKey("."); }
      else if (e.key === "Backspace") { e.preventDefault(); handleCalcKey("⌫"); }
      else if (e.key === "Enter") { e.preventDefault(); confirmCalc(); }
      else if (e.key === "Escape") { e.preventDefault(); closeCalc(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [calcOpen, handleCalcKey, confirmCalc, closeCalc]);

  return (
    <>
      <div className="flex flex-col gap-4 font-lexend sm:flex-row">
        <TotalBalanceCard
          total={bank + hand}
          visible={visible}
          onToggle={() => setVisible((v) => !v)}
        />

        <div className="flex flex-col gap-2 w-full sm:flex-row sm:w-2/4">
          {/* Left column: Cash On-Bank + Cash On-Hand */}
          <div className="flex flex-col gap-4 flex-1">
            <CashOnBankCard
              bank={bank}
              visible={visible}
              isPublished={isPublished}
              canUndo={prevBank !== null}
              onUndo={handleUndoBank}
              onDeposit={() => openCalc("deposit")}
              onWithdrawal={() => openCalc("withdrawal")}
            />
            <CashOnHandCard hand={hand} visible={visible} />
          </div>

          {/* Right column: Collectibles + Fines */}
          <div className="flex flex-col gap-4 flex-1">
            <CollectiblesCard
              coll={coll}
              visible={visible}
              isPublished={isPublished}
              canUndo={prevColl !== null}
              onUndo={handleUndoColl}
              onAdd={() => openCalc("collectibles_add")}
            />
            <FinesCard
              fineAmt={fineAmt}
              totalStudents={totalFineStudents}
              studentsPaid={rest.fineStudentsPaid ?? 0}
              visible={visible}
              isPublished={isPublished}
              finesAdded={finesAdded}
              onEdit={openFineEdit}
              onAddToCollectibles={handleAddFineToCollectibles}
            />
          </div>
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

      <FineEditDialog
        open={fineEditOpen}
        fineAmtInput={fineAmtInput}
        fineTotalInput={fineTotalInput}
        saving={fineSaving}
        onClose={closeFineEdit}
        onFineAmtChange={setFineAmtInput}
        onFineTotalChange={setFineTotalInput}
        onConfirm={saveFineEdit}
      />
    </>
  );
}
