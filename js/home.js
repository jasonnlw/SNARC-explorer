window.Home = {};

Home.initHomePage = async function (lang = "en") {
  const container = document.getElementById("homeContainer");
  if (!container) return;

  container.style.display = "block";
  document.getElementById("app").style.display = "none";

  container.innerHTML = `
    <h2>Homepage</h2>
    <p>This is the new homepage container.</p>
  `;
};
