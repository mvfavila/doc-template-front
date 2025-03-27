<template>
  <div class="home-page">
    <header class="header">
      <div class="logo">
        <h1>Escritório Advogados Associados</h1>
      </div>
      <nav class="navigation">
        <router-link to="/login" class="login-button"
          >Área do Cliente</router-link
        >
      </nav>
    </header>

    <main class="main-content">
      <section class="hero">
        <h2>Seu escritório jurídico digital</h2>
        <p>Soluções jurídicas completas com acompanhamento online</p>
        <router-link to="/login" class="cta-button"
          >Acessar Sistema</router-link
        >
      </section>

      <section class="features">
        <div class="feature-card">
          <h3>Documentos Seguros</h3>
          <p>Envio e armazenamento protegido de todos seus documentos</p>
        </div>
        <div class="feature-card">
          <h3>Comunicação Direta</h3>
          <p>Interação simplificada com seu advogado responsável</p>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>
        © 2023 Escritório Advogados Associados. Todos os direitos reservados.
      </p>
    </footer>
  </div>
</template>

<script setup>
// No logic needed for basic home page
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: "Arial", sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #2c3e50;
  color: white;
}

.logo h1 {
  margin: 0;
  font-size: 1.5rem;
}

.navigation {
  display: flex;
  gap: 1rem;
}

.login-button {
  padding: 0.5rem 1rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.login-button:hover {
  background-color: #3aa876;
}

.main-content {
  flex: 1;
  padding: 2rem;
}

.hero {
  text-align: center;
  padding: 4rem 0;
  background-color: #f5f5f5;
  margin-bottom: 2rem;
}

.hero h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-button {
  display: inline-block;
  padding: 0.8rem 1.5rem;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  margin-top: 1rem;
  transition: background-color 0.3s;
}

.cta-button:hover {
  background-color: #3aa876;
}

.features {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.feature-card {
  flex: 1;
  min-width: 300px;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
}

.footer {
  text-align: center;
  padding: 1rem;
  background-color: #2c3e50;
  color: white;
}
</style>
