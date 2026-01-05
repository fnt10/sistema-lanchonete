from flask import Flask, render_template, request, redirect
import sqlite3
from datetime import datetime

app = Flask(__name__)

def db():
    return sqlite3.connect("pedidos.db")

# Criação da tabela
with db() as con:
    con.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            mesa TEXT,
            itens TEXT,
            total REAL,
            horario TEXT
        )
    """)

CARDAPIO = {
    "lanches": [
        {"nome": "X-Burger", "preco": 15, "descricao": "Pão, hambúrguer, queijo e molho especial"},
        {"nome": "X-Salada", "preco": 18, "descricao": "Pão, hambúrguer, queijo, alface, tomate e maionese"},
        {"nome": "X-Bacon", "preco": 22, "descricao": "Pão, hambúrguer, queijo, bacon crocante e maionese"},
        {"nome": "X-Egg", "preco": 20, "descricao": "Pão, hambúrguer, queijo, ovo e maionese"},
        {"nome": "X-Calabresa", "preco": 21, "descricao": "Pão, hambúrguer, queijo, calabresa acebolada"},
        {"nome": "X-Frango", "preco": 19, "descricao": "Pão, filé de frango grelhado, queijo e maionese"},
        {"nome": "X-Tudo", "preco": 28, "descricao": "Pão, 2 hambúrgueres, queijo, bacon, ovo, alface, tomate e molho especial"},
        {"nome": "Cheeseburger Duplo", "preco": 26, "descricao": "Pão, 2 hambúrgueres, dobro de queijo e molho da casa"},
        {"nome": "Hot Dog Simples", "preco": 12, "descricao": "Pão, salsicha, purê, batata palha e molho"},
        {"nome": "Hot Dog Completo", "preco": 18, "descricao": "Pão, 2 salsichas, purê, milho, ervilha, batata palha e molho"}
    ],
    "bebidas": [
        {"nome": "Coca-Cola", "preco": 6, "descricao": "Lata 350ml"},
        {"nome": "Coca-Cola Zero", "preco": 6, "descricao": "Lata 350ml"},
        {"nome": "Guaraná Antarctica", "preco": 6, "descricao": "Lata 350ml"},
        {"nome": "Fanta Laranja", "preco": 6, "descricao": "Lata 350ml"},
        {"nome": "Sprite", "preco": 6, "descricao": "Lata 350ml"},
        {"nome": "Suco Natural de Laranja", "preco": 8, "descricao": "Copo 400ml"},
        {"nome": "Suco Natural de Limão", "preco": 8, "descricao": "Copo 400ml"},
        {"nome": "Água Mineral", "preco": 4, "descricao": "Sem gás"},
        {"nome": "Água com Gás", "preco": 5, "descricao": "Garrafa 500ml"},
        {"nome": "H2OH!", "preco": 7, "descricao": "Garrafa 500ml"}
    ]
}

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        nome = request.form.get("nome")
        mesa = request.form.get("mesa")
        itens = request.form.get("pedido")
        total = float(request.form.get("total") or 0)

        horario = datetime.now().strftime("%H:%M")

        with db() as con:
            con.execute(
                "INSERT INTO pedidos (nome, mesa, itens, total, horario) VALUES (?, ?, ?, ?, ?)",
                (nome, mesa, itens, total, horario)
            )

        return redirect("/")

    return render_template("index.html", cardapio=CARDAPIO)

@app.route("/admin")
def admin():
    with db() as con:
        pedidos = con.execute("SELECT * FROM pedidos ORDER BY id DESC").fetchall()
    return render_template("admin.html", pedidos=pedidos)

@app.route("/finalizar/<int:pedido_id>")
def finalizar(pedido_id):
    with db() as con:
        con.execute("DELETE FROM pedidos WHERE id = ?", (pedido_id,))
    return redirect("/admin")

@app.route("/api/pedidos")
def api_pedidos():
    with db() as con:
        pedidos = con.execute("SELECT * FROM pedidos ORDER BY id DESC").fetchall()

    lista = []
    for p in pedidos:
        lista.append({
            "id": p[0],
            "nome": p[1],
            "mesa": p[2],
            "itens": p[3],
            "total": p[4],
            "horario": p[5]
        })

    return {"pedidos": lista}

@app.route("/carrinho")
def carrinho_page():
    return render_template("carrinho.html")

if __name__ == "__main__":
    app.run(debug=True)
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)