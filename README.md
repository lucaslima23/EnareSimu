# Simulador ENARE

Este é um simulador web interativo para o Exame Nacional de Residência (ENARE), Edição 2024/2025. O projeto foi desenvolvido com foco em fornecer uma ferramenta de estudo prática e eficiente para candidatos à residência médica.

A aplicação simula a prova de Acesso Direto (ADACEDIRT01) e permite que o usuário responda a 100 questões em um ambiente controlado e com feedback detalhado.

## Funcionalidades

* **Simulado Completo**: A prova contém 100 questões, distribuídas proporcionalmente entre as cinco grandes áreas da medicina: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia, e Medicina Preventiva e Social.
* **Progressão Persistente**: O progresso do simulado é salvo automaticamente no navegador do usuário, permitindo que ele feche a página e retome de onde parou a qualquer momento.
* **Análise de Desempenho**: Ao final do simulado, um relatório detalhado é gerado. Ele mostra o desempenho geral, a porcentagem de acertos por área, e uma lista de assuntos específicos com porcentagens de acerto para focar nos pontos fracos.
* **Revisão de Questões**: O usuário pode revisar a prova completa, vendo a resposta que marcou, a resposta correta e uma explicação detalhada (a ser preenchida).
* **Design Moderno e Responsivo**: A interface foi projetada com uma paleta de cores moderna, efeitos de interatividade e um layout que se adapta a telas de desktop e smartphones. Ele também possui um modo claro e escuro automático.

## Como Acessar

Você pode acessar o simulador online diretamente pelo link:
`https://lucaslima23.github.io/EnareSimu/`

## Tecnologias Utilizadas

O projeto foi construído usando as seguintes tecnologias:
* **HTML5**: Para a estrutura da página.
* **CSS3**: Para a estilização e o layout responsivo.
* **JavaScript (ES6+)**: Para toda a lógica e interatividade da aplicação.

## Estrutura do Projeto

A estrutura de arquivos é simples e direta:
- `index.html`: A página principal do simulador.
- `style.css`: O arquivo de estilos.
- `script.js`: A lógica de funcionamento.
- `questions.json`: O banco de questões em formato JSON.
- `logo.svg`: A imagem da logo.
- `favicon.svg`: O ícone da aba do navegador.

## Como Contribuir

Contribuições são bem-vindas! Se você encontrar um bug, tiver uma sugestão de melhoria ou quiser adicionar mais questões e explicações, sinta-se à vontade para:
1.  Fazer um fork deste repositório.
2.  Criar uma nova branch (`git checkout -b feature/minha-melhoria`).
3.  Fazer suas alterações e commitar (`git commit -m 'feat: adiciona nova funcionalidade'`).
4.  Enviar suas mudanças para a sua branch (`git push origin feature/minha-melhoria`).
5.  Abrir um Pull Request.

## Autor

- **Lucas Matheus de Sousa Lima**

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo `LICENSE` para mais detalhes.
