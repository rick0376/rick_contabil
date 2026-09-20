# Perícia Contábil SaaS

Base Next.js com banco próprio e autenticação integrada ao painel LHP.

## Configuração
1. Copie `.env.example` para `.env`.
2. Configure o banco Neon do sistema contábil.
3. Cadastre um projeto no painel e informe `PANEL_APP_KEY`.
4. Execute `npm install`.
5. Execute `npx prisma migrate dev --name init`.
6. Execute `npm run dev`.
