import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { RoleService } from '../core/role.service';
import { ChatUiService } from '../core/chat-ui.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isMenuOpen = false;

  constructor(public role: RoleService, public chatUi: ChatUiService) {}

  closeMenu(): void {
    this.isMenuOpen = false;
  }
}
