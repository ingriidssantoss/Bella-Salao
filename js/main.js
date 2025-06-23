// Contador de tentativas de login falhas
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 3; // Limite máximo de tentativas

// Simulação de hash de senha (APENAS para demonstração client-side, NÃO seguro para produção)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Converte para 32bit integer
    }
    return hash.toString();
}

// Inicializa o usuário 'admin' padrão se nenhum usuário existir no localStorage
function initializeUsers() {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.length === 0) {
        users.push({ username: "admin", passwordHash: hashPassword("1234") });
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Chama a inicialização de usuários ao carregar o script
initializeUsers();

// Função de login
function login() {
    const user = document.getElementById('usuario').value;
    const pass = document.getElementById('senha').value;
    const mensagemElement = document.getElementById('mensagem');
    mensagemElement.innerText = ''; // Limpa mensagens anteriores

    document.getElementById('senha').value = ''; // Limpa o campo de senha por segurança

    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        mensagemElement.innerText = `Muitas tentativas de login. Tente novamente em alguns minutos.`;
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const hashedPasswordAttempt = hashPassword(pass);
    let authenticated = false;

    // Autentica o usuário comparando username e senha hashada
    for (const storedUser of users) {
        if (storedUser.username === user && storedUser.passwordHash === hashedPasswordAttempt) {
            authenticated = true;
            break;
        }
    }

    if (authenticated) {
        localStorage.setItem('logado', 'true'); // Marca usuário como logado
        localStorage.setItem('currentUser', user); // Armazena o usuário logado
        setCookie('lastUser', user, 7); // Salva último usuário em cookie
        loginAttempts = 0; // Reseta tentativas em caso de sucesso
        window.location.href = "painel.html"; // Redireciona para o painel
    } else {
        loginAttempts++; // Incrementa tentativas falhas
        mensagemElement.innerText = `Usuário ou senha incorretos. Tentativas restantes: ${MAX_LOGIN_ATTEMPTS - loginAttempts}`;
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            mensagemElement.innerText += ` Você será bloqueado após esta tentativa.`;
        }
    }
}

// Função de logout
function logout() {
    localStorage.removeItem('logado');
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
}

// Redireciona para login se não estiver logado ao acessar o painel
if (window.location.pathname.includes('painel.html')) {
    if (!localStorage.getItem('logado')) {
        window.location.href = "index.html";
    }
}

// Ações ao carregar a página
window.onload = () => {
    // Aplica tema salvo (dark/light)
    const tema = localStorage.getItem('tema');
    if (tema === 'dark') {
        document.body.classList.add('dark');
    }

    if (window.location.pathname.includes('painel.html')) {
        carregarClientes(); // Carrega clientes no select de agendamento
        listarClientes(); // Lista clientes na tabela
        listarAgendamentos(); // Lista agendamentos na tabela
        listarUsuarios(); // Lista usuários na tabela (para admin)
        mostrar('cadastroCliente'); // Exibe a seção inicial (cadastro de cliente)
    }
    // Preenche campo de usuário na tela de login com o último usuário, se houver
    if (window.location.pathname.includes('index.html')) {
        const lastUser = getCookie('lastUser');
        if (lastUser) {
            document.getElementById('usuario').value = lastUser;
        }
    }
};

// Alterna o modo noturno (tema)
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('tema', document.body.classList.contains('dark') ? 'dark' : 'light');
}

// Valida formato do nome (apenas letras)
function validarNome(nome) {
    return /^[A-Za-zÀ-ú\s]+$/.test(nome);
}

// Valida formato do telefone (8 a 15 dígitos numéricos)
function validarTelefone(telefone) {
    return /^[0-9]{8,15}$/.test(telefone);
}

// Controla a exibição das seções do painel e ativa o botão de navegação correspondente
function mostrar(secao) {
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none'); // Oculta todas as seções
    document.getElementById(secao).style.display = 'block'; // Exibe a seção desejada

    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active')); // Remove 'active' de todos os botões
    document.querySelector(`nav button[onclick="mostrar('${secao}')"]`).classList.add('active'); // Ativa o botão correto

    // Esconde/mostra botões de admin baseado no usuário logado
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser !== 'admin') {
        document.getElementById('gerenciarUsuariosBtn').style.display = 'none';
        document.getElementById('ferramentasAdminBtn').style.display = 'none';
    } else {
        document.getElementById('gerenciarUsuariosBtn').style.display = 'inline-block';
        document.getElementById('ferramentasAdminBtn').style.display = 'inline-block';
    }

    // Atualiza listas ou campos ao mudar de seção
    if (secao === 'cadastroAgendamento') carregarClientes();
    if (secao === 'listarAgendamentos') listarAgendamentos();
    if (secao === 'listarClientes') listarClientes();
    if (secao === 'cadastroCliente') { // Reseta formulário e botão de cadastro de cliente
        document.getElementById('nomeCliente').value = '';
        document.getElementById('telefoneCliente').value = '';
        document.getElementById('erroCliente').innerText = '';
        const btnCadastrar = document.querySelector('#cadastroCliente button');
        btnCadastrar.innerText = 'Cadastrar';
        btnCadastrar.setAttribute('onclick', 'cadastrarCliente()');
    }
    if (secao === 'cadastroAgendamento') { // Reseta formulário e botão de agendamento
        document.getElementById('data').value = '';
        document.getElementById('hora').value = '';
        document.getElementById('servico').value = '';
        document.getElementById('selectCliente').value = '';
        const btnAgendar = document.querySelector('#cadastroAgendamento button');
        btnAgendar.innerText = 'Agendar';
        btnAgendar.setAttribute('onclick', 'cadastrarAgendamento()');
    }
    if (secao === 'gerenciarUsuarios') { // Atualiza lista de usuários e reseta formulário
        listarUsuarios();
        document.getElementById('usernameNovoUsuario').value = '';
        document.getElementById('passwordNovoUsuario').value = '';
        document.getElementById('erroNovoUsuario').innerText = '';
        const btnCadastrarUsuario = document.querySelector('#gerenciarUsuarios button');
        btnCadastrarUsuario.innerText = 'Cadastrar Usuário';
        btnCadastrarUsuario.setAttribute('onclick', 'cadastrarNovoUsuario()');
    }
}

// =================== CLIENTES ===================

// Adiciona um novo cliente ao localStorage após validação
function cadastrarCliente() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const mensagemErro = document.getElementById('erroCliente');
    mensagemErro.innerText = '';

    if (!nome || !telefone) {
        mensagemErro.innerText = 'Preencha todos os campos!';
        return;
    }
    if (!validarNome(nome)) {
        mensagemErro.innerText = 'O nome deve conter apenas letras!';
        return;
    }
    if (!validarTelefone(telefone)) {
        mensagemErro.innerText = 'O telefone deve conter apenas números (8 a 15 dígitos)!';
        return;
    }

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    clientes.push({ nome, telefone });
    localStorage.setItem('clientes', JSON.stringify(clientes));
    exibirFeedback('Cliente cadastrado com sucesso!', 'success');

    document.getElementById('nomeCliente').value = '';
    document.getElementById('telefoneCliente').value = '';

    listarClientes(); // Atualiza a lista de clientes
    carregarClientes(); // Recarrega o select de clientes para agendamento
}

// Popula o select de clientes no formulário de agendamento
function carregarClientes() {
    const select = document.getElementById('selectCliente');
    select.innerHTML = '<option value="">Selecione um Cliente</option>';
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    
    clientes.forEach((c, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.text = `${c.nome} - ${c.telefone}`;
        select.add(opt);
    });
}

// Renderiza a tabela de clientes
function listarClientes() {
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    let html = '<table>';
    html += '<tr><th>Nome</th><th>Telefone</th><th>Ações</th></tr>';

    clientes.forEach((c, i) => {
        html += `<tr>
            <td>${c.nome}</td>
            <td>${c.telefone}</td>
            <td>
                <button onclick="excluirCliente(${i})" class="btn-excluir">Excluir</button>
                <button onclick="editarCliente(${i})" class="btn-editar">Editar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('tabelaClientes').innerHTML = html;
}

// Exclui um cliente do localStorage
function excluirCliente(index) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    clientes.splice(index, 1); // Remove o cliente do array
    localStorage.setItem('clientes', JSON.stringify(clientes));
    exibirFeedback('Cliente excluído com sucesso!', 'success');
    listarClientes();
    carregarClientes();
}

// Preenche o formulário de cliente com dados para edição
function editarCliente(index) {
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const cliente = clientes[index];

    document.getElementById('nomeCliente').value = cliente.nome;
    document.getElementById('telefoneCliente').value = cliente.telefone;

    const btnCadastrar = document.querySelector('#cadastroCliente button');
    btnCadastrar.innerText = 'Salvar Edição'; // Altera texto do botão
    btnCadastrar.setAttribute('onclick', `salvarEdicaoCliente(${index})`); // Altera função do botão

    mostrar('cadastroCliente'); // Exibe a seção de cadastro de cliente
}

// Salva as edições de um cliente no localStorage
function salvarEdicaoCliente(index) {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const mensagemErro = document.getElementById('erroCliente');
    mensagemErro.innerText = '';

    if (!nome || !telefone) {
        mensagemErro.innerText = 'Preencha todos os campos!';
        return;
    }
    if (!validarNome(nome)) {
        mensagemErro.innerText = 'O nome deve conter apenas letras!';
        return;
    }
    if (!validarTelefone(telefone)) {
        mensagemErro.innerText = 'O telefone deve conter apenas números (8 a 15 dígitos)!';
        return;
    }

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    clientes[index] = { nome, telefone }; // Atualiza o cliente no array
    localStorage.setItem('clientes', JSON.stringify(clientes));

    exibirFeedback('Cliente atualizado com sucesso!', 'success');

    const btnCadastrar = document.querySelector('#cadastroCliente button');
    btnCadastrar.innerText = 'Cadastrar'; // Retorna texto original do botão
    btnCadastrar.setAttribute('onclick', 'cadastrarCliente()'); // Retorna função original

    document.getElementById('nomeCliente').value = '';
    document.getElementById('telefoneCliente').value = '';

    listarClientes();
    carregarClientes();
    mostrar('listarClientes'); // Volta para a lista de clientes
}


// =================== AGENDAMENTOS ===================

// Adiciona um novo agendamento ao localStorage
function cadastrarAgendamento() {
    const clienteIndex = document.getElementById('selectCliente').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    const servico = document.getElementById('servico').value;

    if (clienteIndex === "" || !data || !hora || !servico) {
        exibirFeedback('Preencha todos os campos do agendamento!', 'error');
        return;
    }

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const cliente = clientes[clienteIndex]; // Obtém dados do cliente selecionado

    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos.push({ cliente: cliente.nome, telefone: cliente.telefone, data, hora, servico });
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

    exibirFeedback('Agendamento realizado com sucesso!', 'success');

    document.getElementById('data').value = '';
    document.getElementById('hora').value = '';
    document.getElementById('servico').value = '';
    document.getElementById('selectCliente').value = '';

    listarAgendamentos(); // Atualiza a lista de agendamentos
    mostrar('listarAgendamentos'); // Exibe a lista de agendamentos
}

// Renderiza a tabela de agendamentos, ordenando por data e hora
function listarAgendamentos() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)); // Ordena agendamentos

    let html = '<table>';
    html += '<tr><th>Cliente</th><th>Telefone</th><th>Data</th><th>Hora</th><th>Serviço</th><th>Ações</th></tr>';

    agendamentos.forEach((a, i) => {
        html += `<tr>
            <td>${a.cliente}</td>
            <td>${a.telefone}</td>
            <td>${a.data}</td>
            <td>${a.hora}</td>
            <td>${a.servico}</td>
            <td>
                <button onclick="excluirAgendamento(${i})" class="btn-excluir">Excluir</button>
                <button onclick="editarAgendamento(${i})" class="btn-editar">Editar</button>
            </td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('tabelaAgendamentos').innerHTML = html;
}

// Exclui um agendamento do localStorage
function excluirAgendamento(index) {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos.splice(index, 1);
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    exibirFeedback('Agendamento excluído com sucesso!', 'success');
    listarAgendamentos();
}

// Preenche o formulário de agendamento com dados para edição
function editarAgendamento(index) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    const agendamento = agendamentos[index];

    carregarClientes(); // Garante que o select de clientes esteja populado

    document.getElementById('data').value = agendamento.data;
    document.getElementById('hora').value = agendamento.hora;
    document.getElementById('servico').value = agendamento.servico;

    // Seleciona o cliente correto no dropdown
    const selectCliente = document.getElementById('selectCliente');
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const clienteIndex = clientes.findIndex(c => c.nome === agendamento.cliente && c.telefone === agendamento.telefone);
    if (clienteIndex !== -1) {
        selectCliente.value = clienteIndex;
    }

    const btnAgendar = document.querySelector('#cadastroAgendamento button');
    btnAgendar.innerText = 'Salvar Edição';
    btnAgendar.setAttribute('onclick', `salvarEdicaoAgendamento(${index})`);

    mostrar('cadastroAgendamento');
}

// Salva as edições de um agendamento no localStorage
function salvarEdicaoAgendamento(index) {
    const clienteIndex = document.getElementById('selectCliente').value;
    const data = document.getElementById('data').value;
    const hora = document.getElementById('hora').value;
    const servico = document.getElementById('servico').value;

    if (clienteIndex === "" || !data || !hora || !servico) {
        exibirFeedback('Preencha todos os campos do agendamento!', 'error');
        return;
    }

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const cliente = clientes[clienteIndex];

    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos[index] = { cliente: cliente.nome, telefone: cliente.telefone, data, hora, servico };
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));

    exibirFeedback('Agendamento atualizado com sucesso!', 'success');

    const btnAgendar = document.querySelector('#cadastroAgendamento button');
    btnAgendar.innerText = 'Agendar';
    btnAgendar.setAttribute('onclick', 'cadastrarAgendamento()');

    document.getElementById('data').value = '';
    document.getElementById('hora').value = '';
    document.getElementById('servico').value = '';
    document.getElementById('selectCliente').value = '';

    listarAgendamentos();
    mostrar('listarAgendamentos');
}

// =================== EXPORTAÇÃO ===================

// Exporta a lista de agendamentos para um arquivo TXT
function exportarTXT() {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    if (agendamentos.length === 0) {
        exibirFeedback('Não há agendamentos para exportar!', 'info');
        return;
    }
    let texto = 'Agenda de Consultas:\n\n';
    
    agendamentos.forEach(a => {
        texto += `Cliente: ${a.cliente}, Telefone: ${a.telefone}, Data: ${a.data}, Hora: ${a.hora}, Serviço: ${a.servico}\n`;
    });

    // Cria um Blob e um link de download para o arquivo TXT
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agendamentos.txt';
    link.click(); // Simula o clique para iniciar o download
    exibirFeedback('Agendamentos exportados com sucesso!', 'success');
}

// =================== GERENCIAMENTO DE USUÁRIOS ===================

// Cadastra um novo usuário no localStorage
function cadastrarNovoUsuario() {
    const username = document.getElementById('usernameNovoUsuario').value.trim();
    const password = document.getElementById('passwordNovoUsuario').value.trim();
    const mensagemErro = document.getElementById('erroNovoUsuario');
    mensagemErro.innerText = '';

    if (!username || !password) {
        mensagemErro.innerText = 'Preencha o nome de usuário e a senha!';
        return;
    }
    if (password.length < 4) {
        mensagemErro.innerText = 'A senha deve ter no mínimo 4 caracteres.';
        return;
    }

    let users = JSON.parse(localStorage.getItem('users') || '[]');

    // Verifica se o nome de usuário já existe
    if (users.some(u => u.username === username)) {
        mensagemErro.innerText = 'Nome de usuário já existe. Escolha outro.';
        return;
    }

    const passwordHash = hashPassword(password); // Hash da senha antes de salvar
    users.push({ username, passwordHash });
    localStorage.setItem('users', JSON.stringify(users));
    exibirFeedback(`Usuário '${username}' cadastrado com sucesso!`, 'success');

    document.getElementById('usernameNovoUsuario').value = '';
    document.getElementById('passwordNovoUsuario').value = '';
    listarUsuarios(); // Atualiza a lista de usuários
}

// Renderiza a tabela de usuários
function listarUsuarios() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    let html = '<table>';
    html += '<tr><th>Nome de Usuário</th><th>Ações</th></tr>';

    users.forEach((user, i) => {
        const currentUser = localStorage.getItem('currentUser');
        const isCurrentUser = (user.username === currentUser);
        const isAdmin = (user.username === 'admin'); // Identifica o admin padrão
        
        html += `<tr>
            <td>${user.username}</td>
            <td>`;
        // Só permite excluir se não for o usuário logado e não for o admin padrão
        if (!isCurrentUser && !isAdmin) {
            html += `<button onclick="excluirUsuario(${i})" class="btn-excluir">Excluir</button>`;
        } else {
            html += `<span class="small-text">${isCurrentUser ? '(Você)' : (isAdmin ? '(Admin Principal)' : '')}</span>`;
        }
        html += `</td>
        </tr>`;
    });
    html += '</table>';
    document.getElementById('tabelaUsuarios').innerHTML = html;
}

// Exclui um usuário do localStorage
function excluirUsuario(index) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userToDelete = users[index];
    const currentUser = localStorage.getItem('currentUser');

    if (userToDelete.username === currentUser) {
        exibirFeedback('Você não pode excluir seu próprio usuário logado!', 'error');
        return;
    }
    if (userToDelete.username === 'admin') { // Protege o usuário 'admin' padrão
        exibirFeedback('O usuário "admin" principal não pode ser excluído!', 'error');
        return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário '${userToDelete.username}'?`)) return;

    users.splice(index, 1);
    localStorage.setItem('users', JSON.stringify(users));
    exibirFeedback(`Usuário '${userToDelete.username}' excluído com sucesso!`, 'success');
    listarUsuarios(); // Atualiza a lista
}


// =================== FERRAMENTAS DE DESENVOLVIMENTO/ADMIN ===================

// Reseta todos os dados armazenados no localStorage
function resetarDados() {
    if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados (clientes, agendamentos E USUÁRIOS). Deseja continuar?')) {
        localStorage.clear(); // Limpa todo o localStorage
        initializeUsers(); // Reinicializa o usuário admin padrão
        exibirFeedback('Todos os dados foram resetados com sucesso! Usuário "admin" restaurado.', 'success');
        window.location.href = "index.html"; // Redireciona para o login
    }
}

// =================== FUNÇÕES DE UTILIDADE ===================

// Exibe mensagens de feedback ao usuário
function exibirFeedback(mensagem, tipo = 'info') {
    const painelContainer = document.querySelector('.painel-container');
    let feedbackDiv = document.getElementById('feedback-message');

    if (!feedbackDiv) { // Cria o elemento se não existir
        feedbackDiv = document.createElement('div');
        feedbackDiv.id = 'feedback-message';
        painelContainer.insertBefore(feedbackDiv, painelContainer.firstChild);
    }

    feedbackDiv.className = `feedback-message ${tipo}`;
    feedbackDiv.innerText = mensagem;
    feedbackDiv.style.display = 'block';

    setTimeout(() => { // Oculta a mensagem após 4 segundos
        feedbackDiv.style.display = 'none';
    }, 4000);
}

// Define um cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Obtém o valor de um cookie
function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Apaga um cookie
function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}