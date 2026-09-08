"use client";

import type { ChangeEvent } from "react";
import { getInitials } from "@/lib/format";
import type { AppUser } from "@/services/users";

interface UserSwitcherProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onSwitch: (userId: string) => void;
  disabled?: boolean;
}

export function UserSwitcher({ users, currentUser, onSwitch, disabled }: UserSwitcherProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onSwitch(event.target.value);
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: currentUser?.avatarColor ?? "#94a3b8" }}
        aria-hidden="true"
      >
        {currentUser ? getInitials(currentUser.name) : "?"}
      </span>
      <label className="sr-only" htmlFor="demo-user-switcher">
        Switch demo user
      </label>
      <select
        id="demo-user-switcher"
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        value={currentUser?.id ?? ""}
        onChange={handleChange}
        disabled={disabled || users.length === 0}
      >
        {users.length === 0 && <option value="">No demo users</option>}
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
    </div>
  );
}
