import { Component, input, output, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FoodItem } from '../../../../../models/food-item.model';
import { Subscription as TiffinModel } from '../../../../../models/subscription.model';

@Component({
  selector: 'app-pos-tiffin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pos-tiffin.component.html',
  styleUrls: ['./pos-tiffin.component.scss']
})
export class PosTiffinComponent {
  // --- SIGNALS (Inputs) ---
  menuItems = input.required<FoodItem[]>();
  subscriptions = input.required<TiffinModel[]>();
  isLoading = input<boolean>(false);

  // --- OUTPUTS ---
  createSubscription = output<TiffinModel>();
  toggleStatus = output<TiffinModel>();

  // --- Local State ---
  tiffinForm: FormGroup;

  // --- Computed ---
  // Filter only Tiffin items from the full menu
  tiffinMenuItems = computed(() => {
    return this.menuItems().filter(m => (m.category || '').toUpperCase() === 'TIFFIN');
  });

  constructor(private fb: FormBuilder) {
    this.tiffinForm = this.fb.group({
      customerName: ['', Validators.required],
      customerPhone: ['', Validators.required],
      frequency: ['DAILY', Validators.required],
      durationMonths: [1, Validators.required],
      type: ['LUNCH', Validators.required],
      address: ['', Validators.required],
      pricePerMeal: [100, [Validators.required, Validators.min(1)]], // Not really used if selecting menu item, but good fallback
      menuItemId: [null, Validators.required] // Ensure [ngValue]="null" works in template
    });
  }

  // --- Calculation Logic ---
  get tiffinCalculation(): any {
    const months = this.tiffinForm.value.durationMonths || 1;
    const menuId = this.tiffinForm.value.menuItemId;
    // Find item in the computed list
    const selected = this.tiffinMenuItems().find(m => m.id == Number(menuId));

    if (!selected) return null;

    const dailyPrice = selected.price || 0;
    const standardDays = 30 * months;
    const billedDays = 28 * months; // 2 Days Free per month logic

    const standardTotal = dailyPrice * standardDays;
    const finalPrice = dailyPrice * billedDays;
    const saved = standardTotal - finalPrice;

    return {
      dailyPrice,
      months,
      billedDays,
      finalPrice,
      saved,
      selectedItem: selected
    };
  }

  onCreate() {
    if (this.tiffinForm.invalid) return;

    const calc = this.tiffinCalculation;
    if (!calc) return;

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];

    // Logic from original component
    const totalDays = 30 * calc.months;
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + totalDays);

    const maxDays = totalDays + (5 * calc.months);
    const maxEndDateObj = new Date(today);
    maxEndDateObj.setDate(today.getDate() + maxDays);

    const payload: TiffinModel = {
      customerName: this.tiffinForm.value.customerName || '',
      customerPhone: this.tiffinForm.value.customerPhone || '',
      address: this.tiffinForm.value.address || '',

      startDate: startDate,
      endDate: endDateObj.toISOString().split('T')[0],
      maxEndDate: maxEndDateObj.toISOString().split('T')[0],

      frequency: 'DAILY',
      durationMonths: calc.months,
      menuItemId: Number(this.tiffinForm.value.menuItemId) || 0,
      menuItemName: calc.selectedItem.name || 'Tiffin',

      pricePerDay: calc.dailyPrice,
      billedDays: calc.billedDays,
      discountAmount: calc.saved,
      finalAmount: calc.finalPrice,

      status: 'ACTIVE',
      totalPausedDays: 0
    };

    this.createSubscription.emit(payload);
    this.tiffinForm.reset({
      frequency: 'DAILY',
      durationMonths: 1,
      type: 'LUNCH',
      pricePerMeal: 100
    });
  }
}
