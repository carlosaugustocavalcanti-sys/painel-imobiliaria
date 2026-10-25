import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { num } from '../estoque/formato';

export interface TrechoOrla {
  /** Lugares que o trecho representa (o trecho "Outros" junta vários). */
  lugares: string[];
  nome: string;
  total: number;
  vista: number;
}

/** A faixa da orla: um botão por bairro de praia, em ordem geográfica, com a barra de unidades. */
@Component({
  selector: 'app-orla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="orla-cab">
      <h2 class="orla-tit">Escolha o bairro</h2>
      <p class="orla-leg">
        Do Canto do Forte a Mongaguá, na ordem da praia · altura = unidades no seu filtro ·
        <span class="orla-leg-vm" aria-hidden="true"></span> com vista para o mar
      </p>
    </div>
    <div class="orla-faixa" role="group" aria-label="Filtrar por bairro">
      @for (t of trechos(); track t.nome) {
        <button
          type="button"
          class="trecho"
          [class.on]="ligado(t)"
          [class.sem-un]="!t.total"
          [attr.aria-pressed]="ligado(t)"
          [attr.aria-label]="t.nome + ': ' + t.total + ' unidades, ' + t.vista + ' com vista para o mar'"
          (click)="alternar.emit(t.lugares)"
        >
          <span class="trecho-barra" [style.--h]="altura(t.total)">
            <span class="trecho-vm" [style.--v]="t.total ? t.vista / t.total : 0"></span>
          </span>
          <span class="trecho-nome">{{ t.nome }}</span>
          <span class="trecho-n">{{ fmt(t.total) }}</span>
        </button>
      }
    </div>
    <div class="orla-mar" aria-hidden="true"><span>Mar</span></div>
  `,
  host: { class: 'orla' },
})
export class Orla {
  readonly trechos = input.required<TrechoOrla[]>();
  readonly selecionados = input.required<string[]>();
  readonly alternar = output<string[]>();

  private readonly maximo = computed(() => Math.max(1, ...this.trechos().map((t) => t.total)));
  protected readonly fmt = num;

  /** Raiz quadrada: um bairro com 15 unidades continua visível ao lado de um com 500. */
  protected altura(n: number) {
    return n ? Math.max(0.06, Math.sqrt(n / this.maximo())) : 0.02;
  }
  protected ligado(t: TrechoOrla) {
    const s = this.selecionados();
    return t.lugares.length > 0 && t.lugares.every((l) => s.includes(l));
  }
}
