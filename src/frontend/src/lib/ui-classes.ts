export const primaryButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-accent bg-accent px-[1.1rem] py-[0.7rem] font-bold text-[#182b27] hover:not-disabled:bg-[#e6bd77] disabled:cursor-not-allowed disabled:opacity-55";

export const secondaryButtonClass =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-outline bg-transparent px-[1.1rem] py-[0.7rem] font-bold text-content-primary disabled:cursor-not-allowed disabled:opacity-55";

export const compactPrimaryButtonClass =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-control border border-accent bg-accent px-3 py-1.5 text-sm font-bold text-[#182b27] hover:not-disabled:bg-[#e6bd77] disabled:cursor-not-allowed disabled:opacity-55";

export const compactSecondaryButtonClass =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-control border border-outline bg-transparent px-3 py-1.5 text-sm font-bold text-ink-soft hover:not-disabled:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-55";

export const compactDangerButtonClass =
  "inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-control border border-[#d9a49d] bg-[#fff8f6] px-3 py-1.5 text-sm font-bold text-[#a33d32] hover:not-disabled:bg-[#fdebe8] disabled:cursor-not-allowed disabled:opacity-55";

export const formControlClass =
  "w-full min-h-11 rounded-control border border-border-control bg-surface px-3 py-2.5 font-normal text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-focus disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#f1f5f2] disabled:text-[#52645c]";

export const formInputClass = formControlClass;

export const formSelectClass = `${formControlClass} cursor-pointer`;

export const formTextareaClass = `${formControlClass} resize-y`;

// Kept as an alias while older forms move to the element-specific classes.
export const formFieldClass = formControlClass;

export const formLabelClass = "grid gap-1.5 text-sm font-bold text-ink-label";

export const surfaceCardClass =
  "rounded-card border border-border-default bg-surface";
