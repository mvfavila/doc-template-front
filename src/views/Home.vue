<template>
  <div class="home-page">
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

.main-content {
  flex: 1;
}

.hero {
  text-align: center;
  padding: 4rem 2rem;
  background-color: #f5f5f5;
  margin-bottom: 2rem;
}

.hero h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
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
  padding: 0 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  flex: 1;
  min-width: 300px;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.footer {
  text-align: center;
  padding: 1rem;
  background-color: #2c3e50;
  color: white;
}
</style>
