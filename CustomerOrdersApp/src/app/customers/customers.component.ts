import { Component, OnInit, ViewChild, 
  ViewContainerRef, ComponentFactoryResolver, ComponentRef, OnDestroy } from '@angular/core';

import { DataService } from '../core/services/data.service';
import { ICustomer, IPagedResults, ISalesPerson } from '../shared/interfaces';
import { FilterService } from '../core/services/filter.service';
import { LoggerService } from '../core/services/logger.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'cm-customers',
  templateUrl: './customers.component.html'
})
export class CustomersComponent implements OnInit, OnDestroy {

  title: string;
  filterText: string;
  customers: ICustomer[] = [];
  salesPeople: ISalesPerson[] = [];
  displayMode: DisplayModeEnum;
  displayModeEnum = DisplayModeEnum;
  totalRecords = 0;
  pageSize = 10;
  customersSub: Subscription;
  salesPeopleSub: Subscription;
  mapComponentRef: ComponentRef<any>;
  _filteredCustomers: ICustomer[] = [];

  get filteredCustomers() {
    return this._filteredCustomers;
  }

  set filteredCustomers(value: ICustomer[]) {
    this._filteredCustomers = value;
    this.updateMapComponentDataPoints();
  }

  @ViewChild('mapsContainer', { read: ViewContainerRef }) 
  private mapsViewContainerRef: ViewContainerRef;

  constructor(private componentFactoryResolver: ComponentFactoryResolver,
    private dataService: DataService,
    private filterService: FilterService,
    private logger: LoggerService) { }

  ngOnInit() {
    this.title = 'Customers';
    this.filterText = 'Filter Customers:';
    this.displayMode = DisplayModeEnum.Card;

    this.getCustomersPage(1);
    this.getSalesPeople();
  }

  changeDisplayMode(mode: DisplayModeEnum) {
      this.displayMode = mode;
  }

  pageChanged(page: number) {
    this.getCustomersPage(page);
  }

  getCustomersPage(page: number) {
    this.customersSub = this.dataService.getCustomersPage((page - 1) * this.pageSize, this.pageSize)
        .subscribe((response: IPagedResults<ICustomer[]>) => {
          this.customers = this.filteredCustomers = response.results;
          this.totalRecords = response.totalRecords;
        },
        (err: any) => this.logger.log(err),
        () => this.logger.log('getCustomersPage() retrieved customers for page: ' + page));
  }

  getSalesPeople() {
    this.salesPeopleSub = this.dataService.getSalesPeople()
      .subscribe((salesPeople: ISalesPerson[]) => this.salesPeople = salesPeople);
  }

  filterChanged(data: string) {
    if (data && this.customers) {
        data = data.toUpperCase();
        const props = ['firstName', 'lastName', 'city', 'state.name'];
        this.filteredCustomers = this.filterService.filter<ICustomer>(this.customers, data, props);
    } else {
      this.filteredCustomers = this.customers;
    }
  }

  async lazyLoadMapComponent() {
    this.changeDisplayMode(DisplayModeEnum.Map);
    if (!this.mapsViewContainerRef.length) {
      // Lazy load MapComponent
      const { MapComponent } = await import('../shared/map/map.component');
      console.log('Lazy loaded map component!');
      const component = this.componentFactoryResolver.resolveComponentFactory(MapComponent);
      this.mapComponentRef = this.mapsViewContainerRef.createComponent(component);
      this.mapComponentRef.instance.zoom = 2;
      this.mapComponentRef.instance.dataPoints = this.filteredCustomers;
      this.mapComponentRef.instance.enabled = true;
    }
  }

  updateMapComponentDataPoints() {
    if (this.mapComponentRef) {
      this.mapComponentRef.instance.dataPoints = this.filteredCustomers;
    }
  }

  ngOnDestroy() {
    this.customersSub.unsubscribe();
    this.salesPeopleSub.unsubscribe();
  }


}

enum DisplayModeEnum {
  Card = 0,
  Grid = 1,
  Map = 2
}