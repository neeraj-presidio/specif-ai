import { Component, Input, forwardRef } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { NgIf } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-slider',
  templateUrl: './app-slider.component.html',
  standalone: true,
  imports: [MatSliderModule, NgIf],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppSliderComponent),
      multi: true,
    },
  ],
})
export class AppSliderComponent implements ControlValueAccessor {
  @Input() min: number = 0;
  @Input() max: number = 30;
  @Input() step: number = 1;
  @Input() label: string = '';
  @Input() disabled: boolean = false;

  value: number = 15;
  onChange: any = () => {};
  onTouch: any = () => {};

  writeValue(value: number): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSliderChange(event: Event | number): void {
    const newValue = typeof event === 'number' ? event : (event.target as any).value;
    this.value = newValue;
    this.onChange(newValue);
    this.onTouch();
  }
}
