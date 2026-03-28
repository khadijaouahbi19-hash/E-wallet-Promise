import { getbeneficiaries, finduserbyaccount, findbeneficiarieByid } from "../Model/database.js";

const user = JSON.parse(sessionStorage.getItem("currentUser"));

// DOM elements
const greetingName = document.getElementById("greetingName");
const currentDate = document.getElementById("currentDate");
const solde = document.getElementById("availableBalance");
const incomeElement = document.getElementById("monthlyIncome");
const expensesElement = document.getElementById("monthlyExpenses");
const activecards = document.getElementById("activeCards");
const transactionsList = document.getElementById("recentTransactionsList");
const transferBtn = document.getElementById("quickTransfer");
const transferSection = document.getElementById("transferPopup");
const closeTransferBtn = document.getElementById("closeTransferBtn");
const cancelTransferBtn = document.getElementById("cancelTransferBtn");
const beneficiarySelect = document.getElementById("beneficiary");
const sourceCard = document.getElementById("sourceCard");
const submitTransferBtn = document.getElementById("submitTransferBtn");

// Guard
if (!user) {
  alert("User not authenticated");
  window.location.href = "/index.html";
}

// Events
transferBtn.addEventListener("click", handleTransfersection);
closeTransferBtn.addEventListener("click", closeTransfer);
cancelTransferBtn.addEventListener("click", closeTransfer);
submitTransferBtn.addEventListener("click", handleTransfer);

// Retrieve dashboard data
const getDashboardData = () => {
  const user = JSON.parse(sessionStorage.getItem("currentUser"));
  const monthlyIncome = user.wallet.transactions
    .filter((t) => t.type === "credit")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyExpenses = user.wallet.transactions
    .filter((t) => t.type === "debit")
   .reduce((total, t) => total + t.amount, 0);
 // const solde = user.wallet.balance + monthlyExpenses - monthlyIncome;


  return {
    userName: user.name,
    currentDate: new Date().toLocaleDateString("fr-FR"),
    availableBalance: `${user.wallet.balance} ${user.wallet.currency}`,
    activeCards: user.wallet.cards.length,
    monthlyIncome: `${monthlyIncome} MAD`,
    monthlyExpenses: `${monthlyExpenses} MAD`,
  };
};

function renderDashboard() {
  const dashboardData = getDashboardData(); 

  if (dashboardData) {
    greetingName.textContent = dashboardData.userName;
    currentDate.textContent = dashboardData.currentDate;
    solde.textContent = dashboardData.availableBalance;
    incomeElement.textContent = dashboardData.monthlyIncome;
    expensesElement.textContent = dashboardData.monthlyExpenses;
    activecards.textContent = dashboardData.activeCards;
  }

  // relit depuis sessionStorage au lieu du user global
  const freshUser = JSON.parse(sessionStorage.getItem("currentUser"));
  transactionsList.innerHTML = "";
  freshUser.wallet.transactions.forEach((transaction) => {
    const transactionItem = document.createElement("div");
    transactionItem.className = "transaction-item";
    transactionItem.innerHTML = `
      <div>${transaction.date}</div>
      <div>${transaction.amount} MAD</div>
      <div>${transaction.type}</div>
      <div >${transaction.status === 'failed' ? 'echec ' + transaction.reason : 'Succès'}</div>
    `;
    transactionsList.appendChild(transactionItem);
  });
}

renderDashboard();

// Transfer popup
function closeTransfer() {
  transferSection.classList.remove("active");
  document.body.classList.remove("popup-open");
}

function handleTransfersection() {
  transferSection.classList.add("active");
  document.body.classList.add("popup-open");
}

// Beneficiaries
const beneficiaries = getbeneficiaries(user.id);

function renderBeneficiaries() {
  beneficiaries.forEach((beneficiary) => {
    const option = document.createElement("option");
    option.value = beneficiary.id;
    option.textContent = beneficiary.name;
    beneficiarySelect.appendChild(option);
  });
}
renderBeneficiaries();

function renderCards() {
  user.wallet.cards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.numcards;
    option.textContent = card.type + "****" + card.numcards;
    sourceCard.appendChild(option);
  });
}
renderCards();


function checkUser(numcompte) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const beneficiary = finduserbyaccount(numcompte);
      if (beneficiary) {
        resolve(beneficiary); 
      } else {
        reject("Destinataire introuvable"); 
      }
    }, 2000);
  });
}


function checkSolde(expediteur, amount) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (expediteur.wallet.balance > amount) {
        resolve("Solde suffisant"); 
      } else {
        reject("Solde insuffisant"); 
      }
    }, 3000);
  });
}


function updateSolde(expediteur, destinataire, amount) {
  return new Promise((resolve) => {
    setTimeout(() => {
      expediteur.wallet.balance -= amount;
      destinataire.wallet.balance += amount;
      resolve("Mise à jour du solde effectuée"); 
    }, 200);
  });
}


function addtransactions(expediteur, destinataire, amount) {
  return new Promise((resolve) => {
    setTimeout(() => {
      
      const credit = {
        id: Date.now(),
        type: "credit",
        amount: amount,
        date: new Date().toLocaleString(),
        from: expediteur.name,
      };

      
      const debit = {
        id: Date.now(),
        type: "debit",
        amount: amount,
        date: new Date().toLocaleString(),
        to: destinataire.name,
      };

      expediteur.wallet.transactions.push(debit);
      destinataire.wallet.transactions.push(credit);

      resolve("Transaction ajoutée avec succès"); 
    }, 3000);
  });
}


function transfer(expediteur, numcompte, amount) {//num du dest

  checkUser(numcompte)
    .then((destinataire) => {
      console.log("Étape 1  : Destinataire trouvé -", destinataire.name);
      return checkSolde(expediteur, amount)
        .then((soldeMessage) => {
          console.log("Étape 2  :", soldeMessage);
          return updateSolde(expediteur, destinataire, amount);
        })
        .then((updateMessage) => {
          console.log("Étape 3  :", updateMessage);
          return addtransactions(expediteur, destinataire, amount);
        })
        .then((addTransactionMessage) => {
          console.log("Étape 4  :", addTransactionMessage);
          console.log(" Virement effectué avec succès !");
          renderDashboard(); // on rafraîchit l'affichage
          closeTransfer();   // on ferme le popup
        });
    })
    .catch((erreur) => {
      
      console.log(" Erreur :", erreur);
      alert("Erreur : " + erreur);
    });
}

function handleTransfer(e) {
  e.preventDefault();
  const beneficiaryId = document.getElementById("beneficiary").value;
  const beneficiaryAccount = findbeneficiarieByid(user.id, beneficiaryId).account;
  const sourceCard = document.getElementById("sourceCard").value;
  const amount = Number(document.getElementById("amount").value);

  transfer(user, beneficiaryAccount, amount);
}
// le recharge:
const rechargebtn = document.getElementById("quickTopup");
const closerechargeBtn = document.getElementById("closeTopupBtn");
const cancelRechargeBtn = document.getElementById("cancelTopupBtn");
const submitRechargeBtn = document.getElementById("submitTopupBtn");
const cardSelect = document.getElementById("topupCard");


rechargebtn.addEventListener("click", handleRechargesection);
closerechargeBtn.addEventListener("click", closeRecharge);
cancelRechargeBtn.addEventListener("click", closeRecharge);
submitRechargeBtn.addEventListener("click", handleRecharge);


function handleRechargesection() {
  document.getElementById("topupPopup").classList.add("active");
  document.body.classList.add("popup-open");
}
function closeRecharge() {
  document.getElementById("topupPopup").classList.remove("active");
  document.body.classList.remove("popup-open");
}

function renderCardsForRecharge() {
  user.wallet.cards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.numcards;      
    option.textContent = card.type + " ****" + card.numcards;
    cardSelect.appendChild(option);
  });
}
renderCardsForRecharge();
function checkCard(cardId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const card = user.wallet.cards.find(
        (c) => String(c.numcards) === String(cardId)  
      );
      if (card) {
        resolve(card);
      } else {
        reject("Carte introuvable");
      }
    }, 2000);
  });
}
function checkAmount(amount) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (amount > 10 && amount <= 5000 ) {
        resolve("Montant valide"); 
      } else {
        reject("Montant invalide"); 
      }
    }, 2000);
  });
}
function checkSoldeCard(cardId, amount) {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      if (cardId.balance >= amount) {
        resolve("Solde de la carte suffisant"); 
      } else {
        reject("Solde de la carte insuffisant"); 
      }
      
    },2000);
  })
}
function recharge(cardId, amount) {
  checkCard(cardId)
    .then((card) => {
      console.log("Carte trouvée :", card.type);
      return checkAmount(amount)
        .then((amountMessage) => {
          console.log(amountMessage);
          return checkSoldeCard(cardId, amount);
        })
        .then((soldeMessage) => {
          console.log("Étape 3 :", soldeMessage);

          user.wallet.balance += amount;  

          const credit = {
            id: Date.now(),
            type: "Recharge",
            amount: amount,
            date: new Date().toLocaleString(),
            from: "Recharge - " + card.type,
          };

          user.wallet.transactions.push(credit);
          sessionStorage.setItem("currentUser", JSON.stringify(user));
          renderDashboard();
          closeRecharge();
        });
    })
    .catch((err) => {
      console.log("Erreur :", err);
      alert("Erreur : " + err);
       const failed = {
        id: Date.now(),
        type: "Recharge",
        amount: amount,
        date: new Date().toLocaleString(),
        from: "Recharge échouée",
        status: "failed",                 //  état échec
        reason: err,                      //  raison de l'échec
      };

      user.wallet.transactions.push(failed);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      renderDashboard();                  //  affiche la transaction échouée

      //  message d'erreur à l'utilisateur
      alert("Recharge échouée : " + err);
    
    });
}
function handleRecharge(e) {
  e.preventDefault();
  const cardId = document.getElementById("topupCard").value;
  const amount = Number(document.getElementById("topupAmount").value);
  recharge(cardId, amount);
}

