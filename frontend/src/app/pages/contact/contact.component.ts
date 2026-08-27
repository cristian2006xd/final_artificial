import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  name = '';
  email = '';
  subject = '';
  message = '';

  submitted = false;
  sending = false;
  sent = false;

  submit(): void {
    this.submitted = true;
    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) {
      return;
    }

    this.sending = true;
    this.sent = false;

    setTimeout(() => {
      this.sending = false;
      this.sent = true;
      this.submitted = false;
      this.name = '';
      this.email = '';
      this.subject = '';
      this.message = '';
    }, 900);
  }
}
