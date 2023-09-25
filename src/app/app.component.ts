import { NgForOf, TitleCasePipe } from '@angular/common';
import { Component, TrackByFunction, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { radixChevronDown } from '@ng-icons/radix-icons';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmIconComponent, provideIcons } from '@spartan-ng/ui-icon-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { BrnMenuModule } from '@spartan-ng/ui-menu-brain';
import { HlmMenuModule } from '@spartan-ng/ui-menu-helm';
import { BrnTableModule, useBrnColumnManager } from '@spartan-ng/ui-table-brain';
import { PaginatorState } from '@spartan-ng/ui-table-brain/lib/brn-paginator.directive';
import { HlmTableModule } from '@spartan-ng/ui-table-helm';
import { debounceTime } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { faker } from '@faker-js/faker';

const createUsers = (numUsers = 5) => {
  return Array.from({ length: numUsers }, () => ({
    name: faker.person.fullName(),
    age: faker.number.int({ min: 10, max: 100 }),
    height: faker.number.int({ min: 140, max: 210 }),
  }));
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    NgForOf,

    BrnTableModule,
    HlmTableModule,
    BrnMenuModule,
    HlmMenuModule,
    HlmInputDirective,
    HlmButtonDirective,
    HlmIconComponent,
    TitleCasePipe,
  ],
  providers: [provideIcons({ radixChevronDown })],
  host: {
    class: 'block p-4'
  },
  template: `
    <div class="flex justify-between">
      <input
        hlmInput
        placeholder="Filter by name"
        [ngModel]="_nameFilter()"
        (ngModelChange)="_rawFilterInput.set($event)"
      />

      <button hlmBtn variant="outline" align="end" [brnMenuTriggerFor]="menu">
        Columns
        <hlm-icon name="radixChevronDown" class="ml-2" size="sm" />
      </button>
      <ng-template #menu>
        <div hlm brnMenu class="w-40">
          <button
            *ngFor="let columnName of _brnColumnManager.allColumns"
            hlm
            brnMenuItemCheckbox
            [disabled]="_brnColumnManager.isColumnDisabled(columnName)"
            [checked]="_brnColumnManager.isColumnVisible(columnName)"
            (triggered)="_brnColumnManager.toggleVisibility(columnName)"
          >
            <hlm-menu-item-check />
            <span>{{ columnName | titlecase }}</span>
          </button>
        </div>
      </ng-template>
    </div>

    <brn-table
      hlm
      stickyHeader
      class="mt-4 block h-[337px] overflow-scroll border border-border rounded-md"
      [dataSource]="_data()"
      [displayedColumns]="_brnColumnManager.displayedColumns()"
      [trackBy]="_trackBy"
    >
      <brn-column-def name="name">
        <hlm-th truncate class="w-40" *brnHeaderDef>Name</hlm-th>
        <hlm-td truncate class="w-40" *brnCellDef="let element">
          {{ element.name }}
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="age">
        <hlm-th class="w-40 justify-end" *brnHeaderDef>Age</hlm-th>
        <hlm-td class="w-40 justify-end tabular-nums" *brnCellDef="let element">
          {{ element.age }}
        </hlm-td>
      </brn-column-def>
      <brn-column-def name="height">
        <hlm-th class="w-40 justify-end" *brnHeaderDef>Height</hlm-th>
        <hlm-td class="w-40 justify-end tabular-nums" *brnCellDef="let element">
          {{ element.height }}
        </hlm-td>
      </brn-column-def>
    </brn-table>
    <div
      class="mt-2 flex justify-between items-center"
      *brnPaginator="let ctx; totalElements: _totalElements(); pageSize: _pageSize(); onStateChange: _onStateChange"
    >
      <span class="text-sm tabular-nums"
        >Showing entries {{ ctx.state().startIndex + 1 }} - {{ ctx.state().endIndex + 1 }} of
        {{ _totalElements() }}</span
      >
      <div class="flex">
        <select
          [ngModel]="_pageSize()"
          (ngModelChange)="_pageSize.set($event)"
          hlmInput
          size="sm"
          class="inline-flex mr-1 pr-8"
        >
          <option [value]="size" *ngFor="let size of _availablePageSizes">{{ size === 10000 ? 'All' : size }}</option>
        </select>

        <div class="flex space-x-1">
          <button size="sm" variant="outline" hlmBtn [disabled]="!ctx.decrementable()" (click)="ctx.decrement()">
            Previous
          </button>
          <button size="sm" variant="outline" hlmBtn [disabled]="!ctx.incrementable()" (click)="ctx.increment()">
            Next
          </button>
        </div>
      </div>
    </div>
    <button size="sm" variant="outline" hlmBtn (click)="_loadNewUsers()">Mix it up</button>
  `,
})
export class AppComponent {
  private readonly _startEndIndex = signal({ start: 0, end: 0 });
  protected readonly _availablePageSizes = [10, 20, 50, 100, 10000];
  protected readonly _pageSize = signal(this._availablePageSizes[0]);

  protected readonly _brnColumnManager = useBrnColumnManager({
    name: true,
    age: false,
    height: true,
  });

  protected readonly _rawFilterInput = signal('');
  protected readonly _nameFilter = signal('');
  private readonly _debouncedFilter = toSignal(toObservable(this._rawFilterInput).pipe(debounceTime(300)));

  private readonly _users = signal<{name: string}[]>(createUsers(50));
  private readonly _filteredUsers = computed(() =>
    this._users().filter((user) => {
      const nameFilter = this._nameFilter();
      return !nameFilter || user.name.toLowerCase().includes(nameFilter.toLowerCase());
    })
  );
  protected readonly _data = computed(() =>
    this._filteredUsers().slice(this._startEndIndex().start, this._startEndIndex().end + 1)
  );
  protected readonly _trackBy: TrackByFunction<{name: string}> = (index,user) => user.name;
  protected readonly _totalElements = computed(() => this._filteredUsers().length);
  protected readonly _onStateChange = (state: PaginatorState) => {
    this._startEndIndex.set({ start: state.startIndex, end: state.endIndex });
  };

  constructor() {
    // needed to sync the debounced filter to the name filter, but being able to override the
    // filter when loading new users without debounce
    effect(() => this._nameFilter.set(this._debouncedFilter() ?? ''), { allowSignalWrites: true });
  }

  protected _loadNewUsers() {
    this._nameFilter.set('');
    this._users.set(createUsers(10));
  }
}
