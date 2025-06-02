import { Position } from '../../types';  // This path is
export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: string;
  rotation?: number;
  rotationSpeed?: number;
  scale?: number;
  alpha?: number;
}

type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface QualitySettings {
  maxParticles: number;
  particleMultiplier: number;
}

export class VisualEffectsSystem {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: IParticle[] = [];
  private animationId: number | null = null;
  private particlePool: IParticle[] = [];
  private readonly MAX_PARTICLES = 1000;
  private readonly QUALITY_LEVELS: Record<QualityLevel, QualitySettings> = {
    LOW: { maxParticles: 500, particleMultiplier: 0.5 },
    MEDIUM: { maxParticles: 1000, particleMultiplier: 0.75 },
    HIGH: { maxParticles: 2000, particleMultiplier: 1 }
  };
  private currentQuality: QualityLevel = 'MEDIUM';

  constructor() {
    this.container = this.createContainer();
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);
    
    this.setupCanvas();
    this.startAnimation();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'particle-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    return container;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  }

  private setupCanvas(): void {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener('resize', resize);
  }

  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private getParticleFromPool(): IParticle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '',
      type: ''
    };
  }

  private returnParticleToPool(particle: IParticle): void {
    if (this.particlePool.length < this.MAX_PARTICLES) {
      this.particlePool.push(particle);
    }
  }

  private addParticle(particle: IParticle): void {
    if (this.particles.length >= this.QUALITY_LEVELS[this.currentQuality].maxParticles) {
      return;
    }
    this.particles.push(particle);
  }

  public setQuality(quality: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    this.currentQuality = quality;
  }

  public buffEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const particleCount = Math.floor(30 * this.QUALITY_LEVELS[this.currentQuality].particleMultiplier);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const particle = this.getParticleFromPool();
      Object.assign(particle, {
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2 - 3,
        life: 60,
        maxLife: 60,
        size: Math.random() * 3 + 2,
        color: '#2ed573',
        type: 'sparkle',
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
      this.addParticle(particle);
    }
  }

  public debuffEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const particleCount = Math.floor(25 * this.QUALITY_LEVELS[this.currentQuality].particleMultiplier);

    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      Object.assign(particle, {
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 1,
        life: 45,
        maxLife: 45,
        size: Math.random() * 3 + 2,
        color: '#a55eea',
        type: 'sparkle',
        alpha: 0.8
      });
      this.addParticle(particle);
    }
  }

  public shieldEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const particleCount = Math.floor(20 * this.QUALITY_LEVELS[this.currentQuality].particleMultiplier);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const radius = 30;
      const particle = this.getParticleFromPool();
      Object.assign(particle, {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        life: 90,
        maxLife: 90,
        size: 4,
        color: '#1e90ff',
        type: 'sparkle',
        rotation: angle,
        rotationSpeed: 0.02
      });
      this.addParticle(particle);
    }
  }

  public poisonEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const particleCount = Math.floor(15 * this.QUALITY_LEVELS[this.currentQuality].particleMultiplier);

    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      Object.assign(particle, {
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5,
        life: 40,
        maxLife: 40,
        size: Math.random() * 4 + 2,
        color: '#00b894',
        type: 'sparkle',
        alpha: 0.6
      });
      this.addParticle(particle);
    }
  }

  public burnEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const particleCount = Math.floor(35 * this.QUALITY_LEVELS[this.currentQuality].particleMultiplier);

    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticleFromPool();
      Object.assign(particle, {
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        life: 30,
        maxLife: 30,
        size: Math.random() * 3 + 2,
        color: i % 2 === 0 ? '#ff7675' : '#fab1a0',
        type: 'sparkle',
        alpha: 0.8
      });
      this.addParticle(particle);
    }
  }

  private update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Update life
      particle.life--;
      
      // Apply physics based on type
      switch (particle.type) {
        case 'damage':
        case 'heal':
          particle.vy += 0.2; // Gravity
          break;
        case 'push':
        case 'push-wave':
          particle.scale = particle.scale || 1;
          particle.scale *= 1.05; // Expand
          particle.alpha = (particle.alpha || 1) * 0.95; // Fade
          break;
        case 'impact':
          particle.size *= 1.1; // Grow
          particle.alpha = (particle.alpha || 1) * 0.9; // Fade
          break;
      }
      
      // Update rotation if applicable
      if (particle.rotationSpeed) {
        particle.rotation = (particle.rotation || 0) + particle.rotationSpeed;
      }
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.returnParticleToPool(this.particles[i]);
        this.particles.splice(i, 1);
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach(particle => {
      const alpha = (particle.alpha || 1) * (particle.life / particle.maxLife);
      this.ctx.globalAlpha = alpha;
      
      this.ctx.save();
      
      if (particle.rotation) {
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation);
        this.ctx.translate(-particle.x, -particle.y);
      }
      
      switch (particle.type) {
        case 'sparkle':
          this.renderSparkle(particle);
          break;
        case 'damage':
          this.renderDamageNumber(particle);
          break;
        case 'heal':
          this.renderHealNumber(particle);
          break;
        case 'explosion':
          this.renderExplosion(particle);
          break;
        case 'push':
          this.renderPushEffect(particle);
          break;
        case 'push-wave':
          this.renderPushWave(particle);
          break;
        case 'impact':
          this.renderImpact(particle);
          break;
        case 'slash':
          this.renderSlash(particle);
          break;
        default:
          this.renderDefault(particle);
      }
      
      this.ctx.restore();
    });
    
    this.ctx.globalAlpha = 1;
  }

  private renderSparkle(particle: IParticle): void {
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderDamageNumber(particle: IParticle): void {
    this.ctx.font = `bold ${particle.size}px Arial`;
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeText(`-${Math.floor(particle.size / 2)}`, particle.x, particle.y);
    this.ctx.fillText(`-${Math.floor(particle.size / 2)}`, particle.x, particle.y);
  }

  private renderHealNumber(particle: IParticle): void {
    this.ctx.font = `bold ${particle.size}px Arial`;
    this.ctx.fillStyle = particle.color;
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeText(`+${Math.floor(particle.size / 2)}`, particle.x, particle.y);
    this.ctx.fillText(`+${Math.floor(particle.size / 2)}`, particle.x, particle.y);
  }

  private renderExplosion(particle: IParticle): void {
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size
    );
    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderPushEffect(particle: IParticle): void {
    const scale = particle.scale || 1;
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = 3 * scale;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size * scale, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderPushWave(particle: IParticle): void {
    const scale = particle.scale || 1;
    const gradient = this.ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * scale
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, particle.color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderImpact(particle: IParticle): void {
    // Star burst effect
    const spikes = 8;
    const outerRadius = particle.size;
    const innerRadius = particle.size * 0.5;
    
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = particle.x + Math.cos(angle) * radius;
      const y = particle.y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderSlash(particle: IParticle): void {
    this.ctx.strokeStyle = particle.color;
    this.ctx.lineWidth = particle.size;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(
      particle.x - particle.size * 2,
      particle.y - particle.size * 2
    );
    this.ctx.lineTo(
      particle.x + particle.size * 2,
      particle.y + particle.size * 2
    );
    this.ctx.stroke();
  }

  private renderDefault(particle: IParticle): void {
    this.ctx.fillStyle = particle.color;
    this.ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }

  // Public effect methods
  public playCardEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 30,
        maxLife: 30,
        size: Math.random() * 3 + 1,
        color: '#00d2d3',
        type: 'sparkle'
      });
    }
  }

  public unitSpawnEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 40,
        maxLife: 40,
        size: 3,
        color: '#2ed573',
        type: 'sparkle'
      });
    }
  }

  public attackEffect(from: HTMLElement, to: HTMLElement): void {
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    
    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;
    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;
    
    // Create slash effect
    this.particles.push({
      x: (startX + endX) / 2,
      y: (startY + endY) / 2,
      vx: 0,
      vy: 0,
      life: 15,
      maxLife: 15,
      size: 5,
      color: '#ff4757',
      type: 'slash',
      rotation: Math.atan2(endY - startY, endX - startX)
    });
    
    // Impact effect at target
    setTimeout(() => {
      this.particles.push({
        x: endX,
        y: endY,
        vx: 0,
        vy: 0,
        life: 20,
        maxLife: 20,
        size: 30,
        color: '#ff4757',
        type: 'impact'
      });
    }, 200);
  }

  public damageEffect(element: HTMLElement, damage: number): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -2,
      life: 60,
      maxLife: 60,
      size: 24 + damage * 4,
      color: '#ff4757',
      type: 'damage'
    });
  }

  public healEffect(element: HTMLElement, amount: number): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: -1,
      life: 60,
      maxLife: 60,
      size: 24 + amount * 4,
      color: '#2ed573',
      type: 'heal'
    });
  }

  // The missing pushEffect method!
  public pushEffect(element: HTMLElement, distance: number): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Create expanding ring effect
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.particles.push({
          x,
          y,
          vx: 0,
          vy: 0,
          life: 30,
          maxLife: 30,
          size: 20,
          color: '#ffa502',
          type: 'push-wave',
          scale: 1,
          alpha: 0.6
        });
      }, i * 100);
    }
    
    // Create directional arrows
    const angle = element.classList.contains('player-1') ? -Math.PI / 2 : Math.PI / 2;
    for (let i = 0; i < distance * 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        life: 25,
        maxLife: 25,
        size: 4,
        color: '#ffeb3b',
        type: 'sparkle'
      });
    }
    
    // Impact rings at destination
    for (let i = 0; i < distance; i++) {
      setTimeout(() => {
        this.particles.push({
          x,
          y: y + (i + 1) * 80 * Math.sin(angle),
          vx: 0,
          vy: 0,
          life: 20,
          maxLife: 20,
          size: 15,
          color: '#ffa502',
          type: 'push',
          scale: 1,
          alpha: 0.8
        });
      }, 200 + i * 100);
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.remove();
  }
}