# Regras do projeto

Valem para qualquer chat ou sessão que trabalhe neste repositório.

## Toda alteração

1. Use a skill `impeccable` em qualquer mudança que toque a interface (HTML, CSS, componentes, textos da tela).
2. Ao terminar, confira o build (`npx ng build`) e os testes (`npx ng test --watch=false`).
3. Faça commit e push para `main` sem pedir confirmação. O push publica o painel no GitHub Pages pelo workflow `.github/workflows/pages.yml`.

O Carlos avisa quando não quiser isso numa alteração específica. Sem aviso, sempre faça commit e push.

## Ambiente

O Node não está no PATH padrão. Use `export PATH=$HOME/.local/node-v24.21.0-darwin-arm64/bin:$PATH` (ou `~/.local/node/bin`) antes de rodar `npx`/`npm`.

O push usa o `gh` como credencial (configurado em `.git/config` deste repositório). Se pedir usuário/senha, rode `git config --local credential.https://github.com.helper '!/Users/carloscavalcanti/.local/bin/gh auth git-credential'`.
