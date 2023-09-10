import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-root',
  host: {
    class: 'block bg-background text-foreground p-4'
  },
  template: `
    <p>Hello world</p>
    `
})
export class AppComponent {
}
