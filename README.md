# GTD Personal (estático)

Aplicação web estática para GTD + acompanhamento de projetos com marcos.

## Arquivos

- `index.html`
- `assets/styles.css`
- `assets/app.js`
- `assets/storage.js`
- `assets/models.js`
- `assets/ui.js`

## Funcionalidades

- Funciona 100% no navegador (sem backend).
- Persistência local com `LocalStorage`.
- Captura de Inbox e processamento por fila.
- Listas GTD: Próximas ações, Aguardando, Concluídas, Talvez e Referência.
- Agenda com itens vencidos, hoje, próximos 7 e 30 dias.
- Projetos com status e marcos (milestones) com checklist e notas.
- Templates de projeto:
  - **Consultoria com visitas**
  - **Projeto simples**
- Backup:
  - Exportar JSON
  - Importar JSON com validação e confirmação
  - Reset local com confirmação

## Como usar

1. Abra `index.html` no navegador.
2. Vá em **Inbox** para capturar itens rapidamente.
3. Vá em **Processar** para transformar cada item em:
   - Próxima ação
   - Projeto
   - Aguardando
   - Talvez
   - Referência
   - Lixo
4. Use a aba **GTD** para filtrar e gerenciar tarefas.
5. Use a aba **Projetos** para acompanhar marcos e checklist.
6. Use a aba **Backup** para exportar/importar seus dados.

## Publicar no GitHub Pages

1. Faça push para o repositório no GitHub.
2. No GitHub, abra **Settings** do repositório.
3. Entre em **Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione branch **main** e pasta **/root**.
6. Salve e aguarde o link público ser gerado.

## Observações

- Os dados ficam salvos no navegador atual.
- Se limpar o armazenamento do navegador, os dados locais serão perdidos (a menos que tenha backup JSON).
