# Screenshots, ícone e gráficos das lojas

## Telas sugeridas para capturar (nesta ordem, contando a história do app)

1. **Dashboard/Painel** (`/dashboard`) — visão geral, primeira impressão de valor.
2. **Plano alimentar personalizado** (`/plano-personalizado` ou `/plano-semanal`) —
   mostra o cardápio gerado por IA.
3. **Scanner de alimentos** (`/scanner`) — foto sendo analisada, resultado nutricional.
4. **Diário alimentar** (`/diario`) — registro rápido de refeições/hidratação.
5. **Assistente de IA** (`/assistente`) — uma conversa de exemplo mostrando o valor do chat.
6. **Evolução** (`/evolucao`) — gráfico de progresso (peso/hábitos).
7. (Opcional) **Receitas** (`/receitas`) ou **Onboarding** — se quiser mostrar
   personalização inicial.

Usar dados de exemplo realistas (não deixar campos vazios, "Lorem ipsum" ou dados de
teste como "asdasd"). Preferir o **tema claro** como principal (mais legível em
thumbnails pequenos da loja); pode incluir 1 screenshot no tema escuro para mostrar a
opção.

## Tamanhos exigidos — Google Play

- **Ícone do app**: 512×512 px, PNG de 32 bits (com canal alfa), até 1 MB.
- **Gráfico de recursos (feature graphic)**: 1024×500 px, JPG ou PNG de 24 bits (sem
  transparência) — aparece no topo da ficha da loja.
- **Screenshots de celular**: mínimo 2, recomendado 4–8. Proporção entre 16:9 e 9:16;
  cada lado entre 320px e 3840px. Sugestão prática: capturar em 1080×2340 (ou a
  resolução nativa do celular de teste) e deixar o Play Console redimensionar.
- **Screenshots de tablet (opcional, mas melhora a listagem)**: 7" e 10", mesma
  proporção geral.

## Tamanhos exigidos — App Store

- **Ícone do app**: 1024×1024 px, PNG sem transparência e sem cantos arredondados (a
  Apple aplica a máscara automaticamente). **Atenção:** nosso `resources/icon.png`
  atual tem fundo claro sólido (sem alpha) — deve servir diretamente como base, mas
  confirmar visualmente antes de subir.
- **Screenshots obrigatórios por tamanho de tela** (App Store Connect exige pelo menos
  um conjunto por classe de dispositivo; hoje o mínimo prático costuma ser):
  - iPhone 6.9" (ex.: iPhone 16 Pro Max) — 1320×2868 px (ou 2868×1320 landscape)
  - iPhone 6.5" (ex.: iPhone 11 Pro Max/XS Max) — 1242×2688 px
  - iPad 13" (se o app suportar iPad) — 2064×2752 px
  - Confirmar os tamanhos exatos exigidos no momento do envio em
    App Store Connect → Seu app → Screenshots, pois a Apple ajusta essa lista
    periodicamente.
- Até 10 screenshots por tamanho de tela; os 3 primeiros são os mais importantes
  (aparecem sem o usuário precisar deslizar).

## Onde gerar/tirar as capturas

- **Emulador Android** (Android Studio) com um dispositivo Pixel de referência, ou um
  celular físico — usar `npm run android` para abrir o projeto e rodar em um device/AVD.
- **Simulador iOS** (Xcode, só em Mac) para as capturas da App Store.
- Ferramentas como o próprio simulador exportam PNG direto no tamanho nativo do
  dispositivo selecionado — escolher os devices cujo tamanho bate com a lista acima.

## Vídeo de apresentação (opcional, mas recomendado)

- Google Play: vídeo do YouTube linkado na ficha (até 30s a 2min mostrando o app em uso).
- App Store: "App Preview" gravado no próprio dispositivo/simulador (até 30s).
Não é obrigatório para o lançamento inicial — pode ficar para uma atualização futura.
