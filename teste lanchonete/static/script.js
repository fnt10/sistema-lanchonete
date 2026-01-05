// Gerenciamento do carrinho usando localStorage + pagamento
const CART_KEY = "carrinho_local";

function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(nome, preco) {
    const cart = loadCart();
    const found = cart.find(i => i.nome === nome);
    if (found) found.qtd++;
    else cart.push({ nome, preco: Number(preco), qtd: 1, obs: "" });
    saveCart(cart);
    updateUI();
    vibrar();
}

function updateUI() {
    const cart = loadCart();
    const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
    const count = cart.reduce((s, i) => s + i.qtd, 0);
    const totalElem = document.getElementById("total");
    const totalModal = document.getElementById("totalCarrinho");
    const countElem = document.getElementById("cart-count");
    if (totalElem) totalElem.innerText = total.toFixed(2);
    if (totalModal) totalModal.innerText = total.toFixed(2);
    if (countElem) countElem.innerText = count;
}

function renderCartList() {
    const lista = document.getElementById("listaCarrinho");
    if (!lista) return;
    const cart = loadCart();
    lista.innerHTML = "";
    if (cart.length === 0) {
        lista.innerHTML = "<p>Seu carrinho está vazio.</p>";
        updateUI();
        return;
    }
    cart.forEach((item, index) => {
        const el = document.createElement("div");
        el.className = "item-carrinho";
        const subtotal = (item.preco * item.qtd).toFixed(2);
        el.innerHTML = `
            <div class="item-left">
                <strong>${item.nome}</strong>
                <div class="muted">R$ ${item.preco.toFixed(2)} cada</div>
            </div>
            <div class="item-right">
                <div class="qtd">
                    <button class="menos" data-index="${index}">−</button>
                    <span class="qtd-num">${item.qtd}</span>
                    <button class="mais" data-index="${index}">+</button>
                </div>
                <div class="sub">R$ ${subtotal}</div>
                <button class="remover small" data-index="${index}">Remover</button>
            </div>
        `;
        lista.appendChild(el);
    });
    updateUI();
}

// Delegação de eventos
document.addEventListener("click", (e) => {
    // adicionar (index.html)
    if (e.target.classList.contains("add-btn")) {
        const nome = e.target.dataset.nome;
        const preco = e.target.dataset.preco || "0";
        addToCart(nome, preco);
    }

    // carrinho: aumentar/diminuir/remover
    if (e.target.classList.contains("mais")) {
        const idx = Number(e.target.dataset.index);
        const cart = loadCart();
        if (cart[idx]) cart[idx].qtd++;
        saveCart(cart);
        renderCartList();
    }
    if (e.target.classList.contains("menos")) {
        const idx = Number(e.target.dataset.index);
        const cart = loadCart();
        if (cart[idx]) {
            cart[idx].qtd--;
            if (cart[idx].qtd <= 0) cart.splice(idx, 1);
        }
        saveCart(cart);
        renderCartList();
    }
    if (e.target.classList.contains("remover")) {
        const idx = Number(e.target.dataset.index);
        const cart = loadCart();
        if (cart[idx]) cart.splice(idx, 1);
        saveCart(cart);
        renderCartList();
    }
});

// pagamento - UI dinâmica
function showPaymentInputs(method) {
    document.getElementById("pix-row")?.classList.toggle("hidden", method !== "pix");
    document.getElementById("card-row")?.classList.toggle("hidden", method !== "cartao");
    document.getElementById("cash-row")?.classList.toggle("hidden", method !== "dinheiro");
    // reset change info
    const changeInfo = document.getElementById("change-info");
    if (changeInfo) changeInfo.innerText = "";
}

document.addEventListener("change", (e) => {
    if (!e.target) return;
    if (e.target.name === "pagamento") {
        showPaymentInputs(e.target.value);
    }
});

// calcular troco (dinheiro)
document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "cashPaid") {
        const paid = parseFloat(e.target.value) || 0;
        const cart = loadCart();
        const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
        const changeInfo = document.getElementById("change-info");
        if (changeInfo) {
            if (paid >= total) changeInfo.innerText = "Troco: R$ " + (paid - total).toFixed(2);
            else changeInfo.innerText = "Valor insuficiente";
        }
    }
});

// submissão / pagamento
document.getElementById?.("btn-finalizar")?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const cart = loadCart();
    if (cart.length === 0) { alert("Adicione itens antes de finalizar."); return; }

    const nome = document.getElementById("nomeCart")?.value?.trim();
    const mesa = document.getElementById("mesaCart")?.value?.trim();
    if (!nome || !mesa) { alert("Preencha nome e mesa."); return; }

    const method = document.querySelector('input[name="pagamento"]:checked')?.value || "pix";

    // validações simples por método
    if (method === "pix") {
        const key = document.getElementById("pixKey")?.value?.trim();
        if (!key) { alert("Informe a chave Pix."); return; }
    } else if (method === "cartao") {
        const number = (document.getElementById("cardNumber")?.value || "").replace(/\s+/g, "");
        const name = document.getElementById("cardName")?.value?.trim();
        const cvv = document.getElementById("cardCvv")?.value?.trim();
        if (number.length < 12 || !name || cvv.length < 3) { alert("Preencha os dados do cartão corretamente."); return; }
    } else if (method === "dinheiro") {
        const paid = parseFloat(document.getElementById("cashPaid")?.value || 0);
        const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0);
        if (paid < total) { if (!confirm("Valor pago é menor que o total. Continuar?")) return; }
    }

    // montar resumo e total
    const resumo = cart.map(i => `${i.qtd}x ${i.nome}`).join(" | ");
    const total = cart.reduce((s, i) => s + i.preco * i.qtd, 0).toFixed(2);

    // enviar para o servidor via fetch (POST para rota "/")
    const form = new FormData();
    form.append("nome", nome);
    form.append("mesa", mesa);
    form.append("pedido", resumo);
    form.append("total", total);

    try {
        const resp = await fetch("/", { method: "POST", body: form, credentials: "same-origin" });
        if (resp.ok) {
            // limpar carrinho local e mostrar confirmação
            localStorage.removeItem(CART_KEY);
            renderCartList();
            updateUI();
            showSuccess(`Pagamento via ${method} recebido. Total R$ ${total}. Pedido registrado.`);
        } else {
            showError("Erro ao finalizar pedido. Tente novamente.");
        }
    } catch (err) {
        showError("Falha de rede. Tente novamente.");
    }
});

function showSuccess(msg) {
    const success = document.getElementById("orderSuccess");
    const successMsg = document.getElementById("successMsg");
    if (success && successMsg) {
        successMsg.innerText = msg;
        success.classList.remove("hidden");
        // esconder painel de pagamento
        document.querySelector(".payment-panel")?.classList.add("hidden");
    } else {
        alert(msg);
        window.location.href = "/";
    }
}

function showError(msg) {
    alert(msg);
}

// inicialização
document.addEventListener("DOMContentLoaded", () => {
    updateUI();
    if (document.getElementById("listaCarrinho")) {
        renderCartList();
        // default payment inputs
        showPaymentInputs(document.querySelector('input[name="pagamento"]:checked')?.value || "pix");
    }
});
function vibrar() { if (navigator.vibrate) navigator.vibrate(40); }
