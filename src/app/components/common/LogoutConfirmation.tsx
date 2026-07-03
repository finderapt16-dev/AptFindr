import type { ReactElement } from "react";
import { LogOut } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";

interface LogoutConfirmationProps {
  children: ReactElement;
  onConfirm: () => void;
}

export function LogoutConfirmation({ children, onConfirm }: LogoutConfirmationProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl border-slate-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-black text-slate-950">Log out of Rentiloilo?</AlertDialogTitle>
          <AlertDialogDescription>
            You will need to sign in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Stay logged in</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
