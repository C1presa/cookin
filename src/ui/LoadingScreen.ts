export class LoadingScreen {
  static show(player1Deck: string, player2Deck: string): void {
    const screen = document.createElement('div');
    screen.className = 'loading-battle-screen';
    screen.innerHTML = `
      <div class="battle-intro">
        <div class="player-intro player-1">
          <h3>Player 1</h3>
          <p>${player1Deck}</p>
        </div>
        <div class="versus">VS</div>
        <div class="player-intro player-2">
          <h3>Player 2</h3>
          <p>${player2Deck}</p>
        </div>
      </div>
      <div class="loading-bar">
        <div class="loading-fill"></div>
      </div>
    `;
    document.body.appendChild(screen);
    
    setTimeout(() => {
      screen.classList.add('fade-out');
      setTimeout(() => screen.remove(), 500);
    }, 2000);
  }
} 