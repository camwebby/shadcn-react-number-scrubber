import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface NumericScrubberProps
  extends Omit<React.HTMLAttributes<HTMLInputElement>, "onChange"> {
  /**
   * Current numeric value
   */
  value: number;
  /**
   * Callback whenever the value changes
   */
  onChange: (value: number) => void;
  /**
   * Minimum allowable value (clamped)
   */
  min?: number;
  /**
   * Maximum allowable value (clamped)
   */
  max?: number;
  /**
   * Step for increments (e.g., 1, 0.1, etc.)
   */
  step?: number;
  /**
   * Additional class names for the outer wrapper
   */
  className?: string;

  /**
   * Controls the number of pixels required to increase/decrease a step.
   * A value of 1.0 means 1 pixel per step; 0.1 means 10 pixels per step
   *
   * * For fine-grained control (like opacity: 0-1): use a small value like 0.001
   * * For medium control (like rotation: 0-360): use a medium value like 0.1
   * * For coarse control (like integer counts): use a larger value like 0.5
   */
  scrubSensitivity?: number;
}

export const NumericScrubber = React.forwardRef<
  HTMLInputElement,
  NumericScrubberProps
>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      className,
      scrubSensitivity = 0.5,
      ...rest
    },
    ref
  ) => {
    // Internal state
    const [internalValue, setInternalValue] = React.useState<number>(value);

    // Refs to track dragging
    const isDraggingRef = React.useRef(false);
    const initialXRef = React.useRef(0);
    const initialValueRef = React.useRef(value);

    // Determine how many decimals to keep based on `step`
    const decimals = React.useMemo(() => {
      if (!Number.isFinite(step)) return 0;
      const stepString = step.toString();
      const decimalPart = stepString.split(".")[1];
      return decimalPart ? decimalPart.length : 0;
    }, [step]);

    /**
     * Clamp and quantize the given number
     */
    function clampAndQuantize(n: number) {
      // First quantize to nearest step
      const quantized = Math.round(n / step) * step;
      // Then clamp between min and max
      const clamped = Math.max(min, Math.min(quantized, max));
      return parseFloat(clamped.toFixed(decimals));
    }

    /**
     * On pointer down: start dragging
     */
    function handlePointerDown(e: React.PointerEvent) {
      // Only left-click
      if (e.button !== 0) return;

      isDraggingRef.current = true;
      initialXRef.current = e.clientX;
      initialValueRef.current = internalValue;

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    /**
     * On pointer move: compute distance from initial pointer down
     * and update value accordingly
     */
    function handlePointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - initialXRef.current;
      // Apply sensitivity factor to make scrubbing slower
      let newValue = initialValueRef.current + deltaX * step * scrubSensitivity;
      newValue = clampAndQuantize(newValue);

      setInternalValue(newValue);
      onChange(newValue);
    }

    /**
     * On pointer up: stop dragging
     */
    function handlePointerUp() {
      isDraggingRef.current = false;
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    }

    /**
     * When user types in the input
     */
    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const inputVal = e.target.value;
      if (inputVal === "") {
        setInternalValue(min);
        onChange(min);
        return;
      }

      const parsed = parseFloat(inputVal);
      if (isNaN(parsed)) {
        setInternalValue(min);
        onChange(min);
        return;
      }

      const newValue = clampAndQuantize(parsed);
      setInternalValue(newValue);
      onChange(newValue);
    }

    /**
     * Sync internalValue with external `value` if it changes
     */
    React.useEffect(() => {
      setInternalValue(value);
    }, [value]);

    return (
      <div className={cn("relative group w-fit")}>
        <Input
          ref={ref}
          type="number"
          /**
           * Hide the default spinners in Chrome/Edge/Safari
           */
          className={cn(
            `[appearance:textfield]
             [&::-webkit-inner-spin-button]:appearance-none
             [&::-webkit-outer-spin-button]:appearance-none
             pr-0
             hover:cursor-ew-resize
             active:cursor-none
             `,
            className
          )}
          step={step}
          value={internalValue}
          onChange={handleInputChange}
          onPointerDown={handlePointerDown}
          {...rest}
        />

        <div
          className="absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 cursor-ew-resize select-none"
          onPointerDown={handlePointerDown}
        >
          ↔
        </div>
      </div>
    );
  }
);

NumericScrubber.displayName = "NumericScrubber";
