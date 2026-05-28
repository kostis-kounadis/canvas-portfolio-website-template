import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        "peer relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-300 bg-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 data-[checked]:border-zinc-900 data-[checked]:bg-zinc-900 data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 hover:border-zinc-400",
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
