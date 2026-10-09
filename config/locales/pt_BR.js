/**
 * Brazilian Portuguese translation of the portal chrome.
 *
 * Generated from the inline French and English labels (`npm run i18n:extract`),
 * then translated. Keys mirror the English source; a key missing here reads
 * English. Edit translations here, and the source labels in their components.
 */
const LOCALE = {
    "app/(home)/page#LOCAL": {
        "state": "Meu dossiê",
        "detail": "A fazer"
    },
    "app/company/page#LABELS": {
        "title": "Minha empresa",
        "noSupplier": "Nenhum cadastro de fornecedor",
        "noSupplierHint": "Sua conta não está vinculada a nenhum fornecedor. Entre em contato com seu interlocutor no cliente.",
        "approval": "Status de homologação",
        "approvalHint": "Calculado em tempo real a partir de seus documentos, projetos e não conformidades.",
        "reasons": {
            "documentExpired": "Um documento obrigatório expirou",
            "documentExpiring": "Um documento obrigatório está prestes a expirar",
            "documentMissing": "Um documento obrigatório não foi fornecido",
            "blockingNc": "Uma não conformidade bloqueante está aberta",
            "openProject": "Um projeto de referenciamento está em andamento",
            "blockingCatalog": "Um catálogo bloqueante não foi atendido"
        },
        "metrics": {
            "documentsExpired": "Documentos expirados",
            "documentsExpiring": "Documentos a expirar",
            "documentsMissing": "Documentos ausentes",
            "openNc": "NC abertas",
            "openProjects": "Projetos abertos"
        },
        "sections": {
            "identity": "Identidade",
            "surveyList": "Questionário",
            "contactList": "Contatos",
            "plant": "Unidades",
            "certification": "Certificações",
            "documents": "Documentos",
            "specs": "Especificações"
        },
        "frozen": "Lista validada pelo cliente — somente leitura",
        "emptyList": "Nenhuma linha",
        "emptyListHint": "Esta seção ainda não foi preenchida.",
        "questionnaire": "{done} / {total} perguntas respondidas",
        "noProperties": "Nenhuma propriedade a exibir",
        "yes": "Sim",
        "no": "Não",
        "code": "Código",
        "request": "Solicitar uma atualização"
    },
    "app/documents/page#LABELS": {
        "title": "Meus documentos",
        "tabRequirements": "Exigências",
        "tabAll": "Todos os documentos",
        "tabSigned": "Assinados",
        "deposit": "Enviar um documento",
        "depositTitle": "Enviar um documento",
        "depositHint": "Selecione o produto ao qual ele pertence e depois solte o arquivo. O tipo e a validade são definidos pelo beCPG.",
        "entity": "Produto relacionado",
        "chooseEntity": "Escolha um produto…",
        "filters": {
            "open": "A tratar",
            "blocking": "Bloqueantes",
            "expiring": "A expirar",
            "done": "Fornecidos",
            "all": "Todos"
        },
        "stats": {
            "toProvide": "A fornecer",
            "expired": "Expirados",
            "expiring": "Expiram em < {days} d",
            "compliance": "Conformidade documental",
            "mandatory": "{done} / {total} obrigatórios",
            "noScope": "nenhum escopo a avaliar"
        },
        "search": "Pesquisar um documento",
        "noMatch": "Nenhum documento corresponde a este filtro",
        "noMatchHint": "Experimente “Todos” para ver todos os documentos.",
        "columns": {
            "document": "Documento",
            "entity": "Produto",
            "status": "Status",
            "validity": "Validade",
            "modified": "Modificado",
            "ai": "Análise IA",
            "actions": ""
        },
        "download": "Baixar",
        "noFile": "Ainda não fornecido",
        "blockingBanner": "{count} documento(s) obrigatório(s) estão bloqueando sua homologação. Eles aparecem no topo da lista.",
        "scopeEmpty": "Sua conta não está vinculada a nenhum fornecedor, portanto nenhuma exigência documental pode ser calculada. Os contadores acima estão vazios, não atendidos. Entre em contato com seu interlocutor no cliente."
    },
    "app/error#LABELS": {
        "title": "Não foi possível exibir esta página",
        "message": "Ocorreu um erro técnico durante a exibição. Nada do que você digitou foi perdido: tudo é salvo à medida que você preenche.",
        "retry": "Tentar novamente",
        "home": "Voltar ao início",
        "reference": "Referência a informar ao suporte"
    },
    "app/global-error#LABELS": {
        "title": "Não foi possível iniciar o portal",
        "message": "Um erro técnico impede a exibição do portal. Tente novamente; se o problema persistir, entre em contato com seu interlocutor beCPG informando a referência abaixo.",
        "retry": "Tentar novamente",
        "reference": "Referência"
    },
    "app/help/page#LABELS": {
        "title": "Ajuda",
        "subtitle": "Como o portal funciona, passo a passo",
        "scope": "Portal do fornecedor beCPG",
        "search": "Pesquisar na ajuda",
        "expandAll": "Expandir tudo",
        "collapseAll": "Recolher tudo",
        "topics": "Sumário",
        "noResult": "Nenhum tópico corresponde",
        "noResultHint": "Experimente outra palavra: “documento”, “assinatura”, “etapa”, “homologação”.",
        "anchor": "Link para este tópico",
        "anchorCopied": "Link copiado",
        "goTo": "Ir para",
        "monitorNotice": "Esta ajuda descreve a visão do fornecedor: as telas que seus fornecedores veem, em que “seu cliente” designa sua própria empresa. O espaço de monitoramento ainda não está documentado."
    },
    "app/help/page#TOPICS": [
        {
            "id": "start",
            "icon": "flag",
            "title": "Por onde começar",
            "summary": "O painel responde a uma única pergunta: o que se espera de você, e até quando.",
            "blocks": [
                {
                    "p": "Tudo começa no painel. Os quatro cartões no topo resumem seu cadastro junto a este cliente:"
                },
                {
                    "ul": [
                        "**Status de homologação** — Homologado, Em andamento, A renovar ou Suspenso, com a data de validade.",
                        "**Completude** — a proporção de campos esperados já preenchidos em suas fichas.",
                        "**Ações necessárias** — quantas tarefas estão abertas e quantas estão atrasadas.",
                        "**Documentos** — quantos estão válidos, quantos expiram em breve, quantos estão ausentes."
                    ]
                },
                {
                    "p": "Abaixo deles, as listas trazem o detalhe: suas tarefas, seus produtos, seus documentos, suas discussões e suas notificações. O sino no cabeçalho exibe a mesma lista de notificações em qualquer tela."
                },
                {
                    "note": "Uma mesma conta pode trabalhar para vários clientes beCPG, com um portal por cliente. O logotipo e o nome do cliente são sempre exibidos no canto superior esquerdo: é isso que indica em qual cadastro você está."
                },
                {
                    "warn": "Se uma faixa “Instância de TESTE” for exibida, você está em um ambiente de testes: nada do que você digitar ali tem valor contratual."
                },
                {
                    "links": [
                        {
                            "href": "/",
                            "icon": "dashboard",
                            "label": "Painel"
                        },
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Minhas tarefas"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meus documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "tasks",
            "icon": "assignment_turned_in",
            "title": "Como funciona uma tarefa de referenciamento",
            "summary": "Uma tarefa vem de um projeto aberto pelo seu cliente. O tipo dela define em qual tela você chega.",
            "blocks": [
                {
                    "p": "Seu cliente abre um projeto de referenciamento, e esse projeto envia tarefas a você. Uma tarefa traz um título, o produto em questão, uma data de vencimento e um tipo. Clicar em uma tarefa leva você diretamente à tela que a conclui — não há página intermediária."
                },
                {
                    "ul": [
                        "**Assistente** — preenchimento guiado de uma ficha de produto ou da sua ficha de fornecedor.",
                        "**Assinatura** — leitura de um documento PDF e, em seguida, assinatura.",
                        "**Documento** — envio ou renovação de um documento esperado.",
                        "**Revisão** — leitura completa de um produto, sem nada a preencher."
                    ]
                },
                {
                    "p": "Uma tarefa Planejada ou Em andamento aguarda sua ação. Uma tarefa Recusada foi devolvida pelo seu cliente com um motivo: leia a observação antes de enviar novamente. Uma tarefa Concluída não exige mais nada."
                },
                {
                    "p": "Uma tarefa com a data de vencimento ultrapassada é sinalizada como atrasada, tanto na lista quanto nas notificações. Após sete dias de atraso, ela fica vermelha."
                },
                {
                    "note": "Você pode abrir e sair de uma tarefa quantas vezes precisar: ela permanece aberta até que você mesmo a conclua, e nada se perde entre duas visitas."
                },
                {
                    "links": [
                        {
                            "href": "/tasks",
                            "icon": "assignment_turned_in",
                            "label": "Minhas tarefas"
                        }
                    ]
                }
            ]
        },
        {
            "id": "wizard",
            "icon": "auto_stories",
            "title": "A ordem das etapas do assistente",
            "summary": "Ficha técnica no cabeçalho, um painel Contexto permanente, as seções do seu cliente e, por fim, a conformidade.",
            "blocks": [
                {
                    "p": "O assistente segue sempre a mesma ordem. Não é um túnel: assim que uma etapa é visitada, você pode voltar a ela livremente."
                },
                {
                    "ol": [
                        "**Cabeçalho · Ficha técnica** — a primeira ação esperada de você. Enquanto ela estiver ausente, uma faixa vermelha avisa acima de cada etapa; uma vez enviada, resta uma linha com sua data e sua validade. É o documento que a IA lê para propor valores: sem ele, não há nada a ler. Se seu cliente não configurou esse tipo de documento, a faixa não é exibida.",
                        "**Etapa 0 · Contexto** — um painel sempre visível, que se torna uma folha a um toque de distância no celular. Ele reúne as propostas da IA, a especificação aplicável, as listas que seu cliente já validou e as recusas anteriores. Você nunca passa por ele: ele está lá, qualquer que seja a etapa.",
                        "**As seções do seu cliente** — propriedades, questionário, ingredientes, nutrientes, alergênicos, físico-química, alegações, microbiologia, características organolépticas, materiais de embalagem, documentos… Quais seções aparecem, e em que ordem, depende da configuração do seu cliente e do tipo de produto: o portal não as escolhe.",
                        "**Documentos** — a etapa mantém o lugar que seu cliente lhe atribuiu, geralmente perto do fim. Isso é intencional: o beCPG deduz os documentos esperados a partir do que você preencheu (uma alegação “Livre de OGM” exige o respectivo atestado), portanto, se solicitada cedo demais, a lista estaria vazia ou errada. Apenas a ficha técnica é esperada em todos os casos, e ela fica no cabeçalho.",
                        "**Conformidade** — a lista dos campos ainda ausentes, cada um clicável para ir diretamente até ele, além do índice de completude. Se seu cliente definiu uma verificação bloqueante, a conclusão fica indisponível até que ela seja atendida."
                    ]
                },
                {
                    "note": "Cada seção é salva automaticamente, sem nenhum botão a pressionar. O indicador “Salvo às HH:MM”, na parte inferior do assistente ao lado dos botões de navegação, confirma isso — e você retoma exatamente de onde parou se fechar o portal, trocar de dispositivo ou perder a conexão."
                },
                {
                    "p": "Entre algumas etapas, sua ficha é recalculada (alergênicos, nutrientes, custos…). Esse cálculo é executado em segundo plano e nunca bloqueia você: é possível continuar digitando enquanto ele trabalha."
                },
                {
                    "p": "Em uma tela larga, “Ampliar a área de preenchimento” oculta os painéis laterais e reduz a lista de etapas aos seus ícones, para tabelas largas. A escolha é memorizada de uma ficha para outra; os painéis continuam a um clique, pelos ícones do cabeçalho."
                },
                {
                    "note": "Se seu interlocutor preencher dados em seu nome, uma faixa “você está preenchendo para …” indica isso explicitamente no topo do assistente."
                }
            ]
        },
        {
            "id": "grids",
            "icon": "grid_on",
            "title": "Digitar rapidamente em uma tabela",
            "summary": "Ingredientes, nutrientes, alergênicos: tudo é feito pelo teclado, e um bloco de planilha pode ser colado diretamente.",
            "blocks": [
                {
                    "p": "As seções em tabela — ingredientes, nutrientes, alergênicos, físico-química… — são preenchidas sem sair do teclado. O botão de teclado acima da tabela exibe a lista novamente a qualquer momento."
                },
                {
                    "ul": [
                        "**Tab / Shift+Tab** — célula seguinte / anterior.",
                        "**Enter** — salva a linha e desce na mesma coluna; na última linha, adiciona uma nova.",
                        "**↑ / ↓** — mesma coluna, linha acima / abaixo.",
                        "**Esc** — descarta as alterações da linha em edição.",
                        "**Ctrl+D** — duplica a linha atual.",
                        "**Ctrl+V** — cola um bloco de células de uma planilha."
                    ]
                },
                {
                    "p": "Colar de uma planilha aceita várias linhas e colunas de uma só vez, cria as linhas que faltam e informa o que não pôde ser aceito — um valor fora da lista proposta, um número esperado onde há texto, uma coluna somente leitura. Nada é adivinhado: o que não tiver correspondência exata é devolvido para você corrigir."
                },
                {
                    "note": "Como em todo o assistente, uma linha é salva assim que você sai dela — ou ao pressionar Enter, ou assim que você marca uma caixa. Não há botão de salvar: não há nada a confirmar. Apenas uma colagem oferece “Salvar as N linhas”, porque ninguém revisou essas linhas."
                },
                {
                    "p": "No celular, a tabela se torna um cartão por linha: os mesmos campos, empilhados, sem rolagem horizontal."
                }
            ]
        },
        {
            "id": "specs",
            "icon": "menu_book",
            "title": "Especificação e catálogo: qual a diferença",
            "summary": "Uma especificação é lida. Um catálogo é preenchido — e é ele que decide se você pode concluir.",
            "blocks": [
                {
                    "p": "São dois objetos diferentes, e não servem ao mesmo momento. O mais simples é considerá-los na ordem em que você os encontra."
                },
                {
                    "ul": [
                        "**A especificação** — um documento do seu cliente, vinculado a um produto ou a uma família de produtos. Ela enuncia as exigências dele: materiais proibidos, origens aceitas, limites analíticos, condições de transporte, compromissos de RSE. É um **texto de referência**, para ser lido. O portal a exibe no painel “Contexto” do assistente, e a tela “Especificações” reúne todas elas.",
                        "**O catálogo** — uma **lista de campos obrigatórios** definida pelo seu cliente: “para que uma matéria-prima seja referenciada comigo, preciso da origem, da densidade, do código EAN, do alergênico principal…”. Não é um texto, é uma verificação. O portal o calcula continuamente e informa a pontuação na etapa “Conformidade”."
                    ]
                },
                {
                    "p": "Em outras palavras: a especificação diz **o que seu cliente espera do seu produto**, o catálogo verifica **se a ficha dele está completa**. Você pode atender à especificação e ainda ter uma ficha incompleta, e vice-versa."
                },
                {
                    "p": "Apenas um dos dois impede o envio: o catálogo. Quando seu cliente declarou um catálogo bloqueante, o botão “Concluir” fica indisponível enquanto faltar um campo, e a etapa “Conformidade” lista exatamente quais — cada linha leva você ao campo."
                },
                {
                    "note": "Uma especificação também pode exigir documentos (um certificado orgânico, um atestado de ausência de OGM). Eles aparecem em “Meus documentos” e na etapa Documentos, com suas datas de validade — não no catálogo."
                },
                {
                    "links": [
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Especificações"
                        },
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meus documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "frozen",
            "icon": "lock",
            "title": "O que significa uma lista congelada",
            "summary": "Uma lista validada pelo seu cliente passa a ser somente leitura. Isso é intencional, e reversível mediante solicitação.",
            "blocks": [
                {
                    "p": "Quando seu cliente valida uma seção — a lista de ingredientes, o questionário, os alergênicos… — essa seção fica **congelada**: você continua a vê-la com todos os seus valores, mas não pode mais alterá-la. Um cadeado e a menção “Somente leitura” indicam isso."
                },
                {
                    "p": "Esse é o objetivo: uma vez validado, um valor se torna a referência na qual seu cliente se baseia (rotulagem, especificações, controles). Se ele pudesse mudar sem o conhecimento do cliente, a validação não teria valor algum."
                },
                {
                    "p": "As listas congeladas também aparecem no painel “Contexto” do assistente, em “Listas validadas”: é a forma mais rápida de ver o que está definido e o que ainda está em aberto."
                },
                {
                    "warn": "Encontrou um erro em uma lista congelada? Não crie uma ficha duplicada. Solicite a reabertura da seção pela discussão vinculada à ficha: seu cliente a descongela e você a recebe de volta editável."
                },
                {
                    "p": "Uma ficha inteira também pode estar em somente leitura por outro motivo: a tarefa foi concluída, o projeto foi encerrado ou você tem apenas acesso de leitura. O assistente indica qual desses casos se aplica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussões"
                        }
                    ]
                }
            ]
        },
        {
            "id": "confidence",
            "icon": "auto_awesome",
            "title": "O que a IA propõe",
            "summary": "Propostas — nunca valores escritos em seu lugar.",
            "blocks": [
                {
                    "p": "Quando a extração automática está ativada no seu cliente, o portal lê seus documentos e propõe os valores encontrados. Eles aparecem no painel “Contexto”, à direita do formulário, e são relidos a cada mudança de etapa — o que você acabou de preencher altera o que resta a propor."
                },
                {
                    "p": "Tudo começa pela **ficha técnica**, no cabeçalho do assistente. Enquanto ela não for enviada, não há nada a ler e a lista de propostas permanece vazia: é isso que a faixa vermelha significa."
                },
                {
                    "ul": [
                        "**Aplicar** — o valor é gravado na ficha. Nada é gravado antes desse clique.",
                        "**Expandir** — para análises longas que não cabem no painel."
                    ]
                },
                {
                    "note": "Uma proposta que você não deseja não precisa ser recusada: basta não aplicá-la, o que já é o padrão. Nenhum valor é aplicado automaticamente, por mais segura que a leitura afirme ser. É você quem se compromete com a ficha: a decisão é sua, campo a campo."
                },
                {
                    "p": "Em todos os casos, o valor final é seu: você continua responsável pelo que valida, e nada chega ao seu cliente antes que você conclua a tarefa."
                }
            ]
        },
        {
            "id": "documents",
            "icon": "folder_shared",
            "title": "Validade e renovação dos documentos",
            "summary": "O portal sabe quais documentos são esperados, por quanto tempo são válidos e quais estão faltando.",
            "blocks": [
                {
                    "p": "Os documentos esperados não são uma lista que você precisa adivinhar: seu cliente os configura (tipo de documento, obrigatório ou não, prazo de validade, escopo), e a tela “Meus documentos” os apresenta exatamente assim, produto por produto."
                },
                {
                    "ul": [
                        "**Válido** — fornecido, aceito, e o fim da validade não está próximo.",
                        "**A renovar** — o fim da validade está a menos de 60 dias (um prazo que seu cliente pode ajustar).",
                        "**Expirado** — o fim da validade já passou. Para um documento obrigatório, isso suspende sua homologação.",
                        "**Ausente** — esperado e nunca fornecido.",
                        "**Recusado** — fornecido, mas recusado pelo seu cliente: leia o motivo antes de enviar novamente."
                    ]
                },
                {
                    "p": "Cada documento tem um período de validade (início e fim), exibido em sua linha e colorido como o beCPG o colore: **verde** enquanto estiver dentro do período, **laranja** quando o prazo se aproxima, **vermelho** depois que ele passou."
                },
                {
                    "p": "Dependendo do tipo, esse período é deduzido automaticamente da data de envio e do prazo configurado pelo seu cliente, ou **cabe a você informá-lo**: dois campos de data aparecem então na área de envio, a serem preenchidos com base no documento que você está enviando. Eles acompanham o arquivo e continuam editáveis depois, por meio de “Editar” na linha."
                },
                {
                    "warn": "Um documento obrigatório cuja validade nunca foi preenchida é sinalizado em vermelho, “Validade a preencher”. Sem data de fim, ele nunca expirará, nenhum lembrete será enviado e seu cliente não saberá desde quando ele é válido."
                },
                {
                    "p": "Renovar significa enviar uma nova versão na mesma linha — nunca criar uma segunda linha. A versão anterior permanece no histórico do documento com seu próprio período de validade: é isso que comprova que você estava coberto em uma data passada."
                },
                {
                    "note": "O nome do arquivo e o local onde ele é arquivado não importam: o portal renomeia e arquiva o documento de acordo com a configuração do seu cliente. Envie o arquivo tal como ele foi entregue a você."
                },
                {
                    "p": "Os lembretes por e-mail antes da expiração são enviados pelo beCPG conforme as regras definidas pelo seu cliente. O portal sempre mostra o estado real: não confie no e-mail, “Meus documentos” é a referência."
                },
                {
                    "links": [
                        {
                            "href": "/documents",
                            "icon": "folder_shared",
                            "label": "Meus documentos"
                        }
                    ]
                }
            ]
        },
        {
            "id": "approval",
            "icon": "verified",
            "title": "O status de homologação",
            "summary": "Calculado em tempo real a partir de seus documentos, suas fichas e suas não conformidades. Nunca congelado.",
            "blocks": [
                {
                    "p": "O status exibido no painel não é uma decisão digitada manualmente: ele é recalculado a cada exibição, a partir do seu cadastro. Corrija a causa e ele muda."
                },
                {
                    "ul": [
                        "**Suspenso** — pelo menos um documento obrigatório expirou, ou uma não conformidade bloqueante está aberta.",
                        "**A renovar** — pelo menos um documento obrigatório está prestes a expirar.",
                        "**Em andamento** — um projeto de referenciamento está aberto, ou um documento obrigatório nunca foi fornecido, ou uma verificação bloqueante não foi atendida.",
                        "**Homologado** — nenhum dos casos acima."
                    ]
                },
                {
                    "p": "O cartão do painel lista os motivos do status: cada um é clicável e leva você ao que precisa ser corrigido."
                },
                {
                    "note": "Esse mesmo status é lido pelos sistemas de compras do seu cliente. Um documento obrigatório expirado pode, portanto, bloquear um pedido, e não apenas exibir uma etiqueta laranja."
                }
            ]
        },
        {
            "id": "signature",
            "icon": "draw",
            "title": "Como funciona a assinatura",
            "summary": "Pede-se que você leia primeiro e depois assine. A assinatura é aplicada pelo beCPG, não pelo seu navegador.",
            "blocks": [
                {
                    "p": "Uma tarefa de Assinatura abre o documento em um visualizador integrado ao portal. O arquivo nunca sai do portal e continua utilizável no celular."
                },
                {
                    "ol": [
                        "**Leia o documento inteiro.** O progresso da leitura é acompanhado página por página: enquanto uma página não tiver sido exibida, a assinatura fica indisponível.",
                        "**Desenhe sua assinatura** com o dedo, o mouse ou uma caneta, nos locais preparados pelo seu cliente. As áreas de assinatura e de rubrica foram posicionadas previamente: você não precisa posicioná-las.",
                        "**Marque a caixa de consentimento** e depois envie. A tarefa é enviada uma única vez."
                    ]
                },
                {
                    "p": "O beCPG assina o documento em seu servidor, arquiva a versão assinada e a envia por e-mail aos destinatários. O portal não emite nenhum certificado próprio."
                },
                {
                    "note": "Se a conexão cair durante o envio, tente novamente: a solicitação traz um identificador único, portanto uma solicitação recebida duas vezes não assina duas vezes. Um documento já assinado é exibido como tal, com seu download, em vez de pedir que você assine novamente."
                },
                {
                    "warn": "Uma assinatura não pode ser recusada nem desfeita pelo portal. Se o documento estiver incorreto, não assine: abra a discussão e informe seu cliente."
                }
            ]
        },
        {
            "id": "discussion",
            "icon": "forum",
            "title": "Onde chegam as observações do seu cliente",
            "summary": "Uma conversa por ficha, mas cada mensagem é vinculada ao assunto a que se refere.",
            "blocks": [
                {
                    "p": "A discussão de uma ficha é a mesma dos dois lados: o que seu cliente escreve no beCPG chega a você aqui, e suas respostas chegam a ele lá. Não há uma caixa de correio separada para acompanhar."
                },
                {
                    "p": "Uma mensagem pode estar vinculada a três lugares, e o seletor no topo do painel permite escolher qual você lê ou a qual se dirige:"
                },
                {
                    "ul": [
                        "**A ficha inteira** — a conversa completa, incluindo as observações deixadas em um campo ou em uma linha de tabela. Esta é a visualização padrão.",
                        "**Um campo** — “a razão social está incompleta”. Um balão aparece então ao lado desse campo no assistente.",
                        "**Uma linha de tabela** — “as gorduras saturadas estão erradas”. A observação acompanha a linha, não o número da linha."
                    ]
                },
                {
                    "note": "Escrever a partir de um campo ou de uma linha, em vez de “A ficha inteira”, economiza o tempo de todos: seu interlocutor vê imediatamente do que você está falando, sem procurar entre duzentos campos."
                },
                {
                    "p": "A discussão fica em somente leitura depois que o referenciamento é encerrado: você pode reler a troca, mas não acrescentar nada. A tela indica qual desses motivos se aplica."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussões"
                        }
                    ]
                }
            ]
        },
        {
            "id": "contact",
            "icon": "support_agent",
            "title": "Quem contatar",
            "summary": "Seu interlocutor é o seu cliente. A discussão vinculada à ficha é o canal adequado.",
            "blocks": [
                {
                    "p": "Este portal é aberto para você pelo seu cliente: ele configura os documentos esperados, as etapas do assistente, as validações e os prazos. Ele é, portanto, seu primeiro interlocutor para qualquer questão de conteúdo."
                },
                {
                    "ul": [
                        "**Uma dúvida sobre uma ficha, uma observação, uma correção, uma lista a descongelar** — use a discussão vinculada à ficha ou à tarefa. Sua mensagem chega à pessoa que acompanha seu cadastro e fica vinculada ao produto em questão.",
                        "**Um documento recusado sem motivo claro** — responda na discussão do produto antes de enviar novamente.",
                        "**Um prazo que você não consegue cumprir** — informe isso na discussão em vez de deixar a tarefa atrasar.",
                        "**Um problema de acesso** (senha, colega a adicionar, conta a encerrar) — fale com seu interlocutor no cliente: as contas são criadas e encerradas do lado dele, não por este portal."
                    ]
                },
                {
                    "note": "Os contatos que você declarou, e os contatos do seu cliente, estão listados na sua ficha de fornecedor, aba Contatos."
                },
                {
                    "links": [
                        {
                            "href": "/messages",
                            "icon": "forum",
                            "label": "Discussões"
                        },
                        {
                            "href": "/company",
                            "icon": "business",
                            "label": "Minha empresa"
                        },
                        {
                            "href": "/specs",
                            "icon": "menu_book",
                            "label": "Especificações"
                        }
                    ]
                }
            ]
        }
    ],
    "app/login/page#PAGE_TEXT": {
        "welcome": "Bem-vindo",
        "intro": "Entre para acessar seu espaço de fornecedor: suas tarefas, seus produtos, seus documentos e seu status de homologação.",
        "chooseTenant": "Selecione seu cliente",
        "chooseTenantHelp": "Trabalha para vários clientes beCPG? Escolha aquele cujo cadastro deseja abrir.",
        "sso": "Você será redirecionado para o serviço de autenticação do seu cliente.",
        "testNotice": "Instância de TESTE — os dados digitados aqui não têm valor contratual.",
        "help": "Precisa de ajuda?",
        "errorTitle": "Falha na autenticação",
        "pitch": "O portal do fornecedor beCPG",
        "sellingPoints": [
            {
                "icon": "assignment_turned_in",
                "text": "Suas solicitações de referenciamento e suas tarefas, em um só lugar"
            },
            {
                "icon": "folder_shared",
                "text": "Seus documentos e certificados, com suas datas de expiração"
            },
            {
                "icon": "verified",
                "text": "Seu status de homologação, mantido atualizado pelo seu cliente"
            }
        ]
    },
    "app/login/page#ERROR_TEXT": {
        "oidc_not_configured": "A autenticação não está configurada para este cliente.",
        "tenant_mismatch": "Sua sessão pertencia a outro cliente. Entre novamente.",
        "dev_auth_misconfigured": "O modo de desenvolvimento está ativado, mas mal configurado.",
        "session_expired": "Sua sessão expirou. Entre novamente."
    },
    "app/messages/page#LABELS": {
        "title": "Discussões",
        "subjects": "Assuntos",
        "messageCount": "{count} mensagem(ns)",
        "search": "Pesquisar um assunto",
        "myRecord": "Minha ficha de fornecedor",
        "back": "Assuntos",
        "placeholder": "Escreva uma mensagem…",
        "send": "Enviar",
        "sending": "Enviando…",
        "empty": "Nenhuma mensagem",
        "emptyHint": "Inicie a discussão — o cliente será notificado.",
        "noSubject": "Escolha um assunto",
        "noSubjectHint": "Selecione um produto ou sua ficha para ver as trocas.",
        "noSubjects": "Nenhum assunto de discussão",
        "noSubjectsHint": "As discussões estão vinculadas aos seus produtos. No momento, nenhum produto está vinculado a você.",
        "field": "Campo",
        "edited": "editado",
        "you": "Você",
        "openSubject": "Abrir a ficha",
        "thread": "Discussão",
        "more": "Carregar mais",
        "loading": "Carregando…",
        "tooLong": "Mensagem muito longa (máximo de 20.000 caracteres).",
        "denyReasons": {
            "noAssignedTask": "O referenciamento foi encerrado: esta discussão está em somente leitura.",
            "readAccess": "Você tem apenas acesso de leitura a esta ficha.",
            "noPermission": "Você não tem permissão para escrever nesta discussão."
        }
    },
    "app/monitor/campaigns/[id]/page#LABELS": {
        "back": "Projetos",
        "notFound": "Projeto não encontrado",
        "notFoundHint": "Este projeto não existe, não é um projeto de fornecedor ou está fora do seu perímetro.",
        "kpi": {
            "response": "Taxa de resposta",
            "age": "Aberto há",
            "due": "Data de vencimento",
            "tasks": "Tarefas abertas"
        },
        "hints": {
            "days": "{count} d",
            "noDue": "Sem data de vencimento",
            "overdue": "{count} d de atraso",
            "dueIn": "em {count} d",
            "late": "{count} atrasada(s)",
            "unanswered": "Sem resposta desde a abertura"
        },
        "tasks": "Tarefas abertas",
        "tasksEmpty": "Nenhuma tarefa aberta neste projeto.",
        "tasksHint": "O que o fluxo de trabalho aguarda, e de quem.",
        "noAssignee": "Não atribuída",
        "entities": "Sobre o que é o projeto",
        "entitiesHint": "Abra a ficha para ler os dados em preenchimento e a respectiva discussão.",
        "entitiesEmpty": "Este projeto não referencia nenhuma ficha.",
        "unreadable": "Fora do seu perímetro",
        "open": "Abrir",
        "suppliers": "Fornecedores",
        "manager": "Responsável",
        "discussion": "Discussão do projeto",
        "state": "Estado"
    },
    "app/monitor/campaigns/page#LABELS": {
        "title": "Projetos",
        "subtitle": "Projetos de referenciamento e de renovação em aberto. Selecione projetos para lembrar ou escalar seus fornecedores.",
        "stats": {
            "open": "Projetos abertos",
            "openState": "Projetos · {state}",
            "response": "Taxa de resposta",
            "unanswered": "Sem resposta",
            "reminders": "Lembretes pendentes"
        },
        "hints": {
            "scanned": "{count} analisados",
            "meanCompletion": "Progresso médio {value}%",
            "escalations": "{count} a escalar",
            "late": "{count} atrasado(s)",
            "noEscalation": "Nenhuma escalação necessária",
            "answered": "{count} respondido(s)"
        },
        "startCampaign": "Iniciar um projeto",
        "allOpen": "Todos os projetos abertos",
        "state": "Estado do projeto",
        "sortLabel": "Ordenar por",
        "sorts": {
            "dueDate": "Vencimento mais próximo",
            "completion": "Menor taxa de resposta",
            "age": "Abertos há mais tempo",
            "name": "Nome"
        },
        "searchSupplier": "Filtrar por fornecedor",
        "truncated": "Janela de leitura: o beCPG limita uma listagem a 250 linhas e {scanned} projeto(s) foram lidos. A ordenação e os totais desta página cobrem essa janela — restrinja o estado ou o perímetro para uma visão completa.",
        "scopeEmpty": "Nenhum fornecedor corresponde a este perímetro. Nenhum projeto pode estar vinculado a ele: os contadores acima são zero por construção, não medições.",
        "parkScoped": "Contadores restritos ao perímetro filtrado ({count} fornecedor(es)).",
        "noRate": "Nenhum projeto a avaliar",
        "unsupported": "Filtro(s) não suportado(s) pelo modelo padrão do beCPG: {names}. Configure-os no lado do cliente.",
        "pageOf": "{from}-{to} de {total} projetos",
        "previous": "Anterior",
        "next": "Próximo",
        "rows": "Linhas",
        "reminder": "Seu projeto aberto no portal ainda aguarda sua resposta. Conclua as tarefas atribuídas a você o mais breve possível.",
        "hintTargets": "Fornecedores dos projetos selecionados",
        "noteReminder": "O beCPG não mantém registro de lembretes: a coluna “Último lembrete” mostra a última atividade do projeto, o dado mais próximo realmente disponível.",
        "truncatedShort": "Janela: {scanned} projetos lidos"
    },
    "app/monitor/documents/page#LABELS": {
        "title": "Conformidade documental",
        "subtitle": "Matriz fornecedor × tipo de documento. Selecione células ou linhas para enviar um lembrete em massa.",
        "search": "Pesquisar um fornecedor",
        "allTypes": "Todos os tipos de documento",
        "allStatuses": "Todos os status",
        "mandatoryOnly": "Somente documentos obrigatórios",
        "export": "Exportar (CSV)",
        "stats": {
            "suppliers": "Fornecedores",
            "missing": "Ausentes",
            "expired": "Expirados",
            "expiring": "A renovar",
            "refused": "Recusados"
        },
        "statuses": {
            "valid": "Válido",
            "expiring": "Expira em breve",
            "expired": "Expirado",
            "missing": "Ausente",
            "refused": "Recusado",
            "toValidate": "Em análise"
        },
        "truncated": "Base de fornecedores maior que a janela de leitura ({scanned} fornecedores de {total}): restrinja os filtros para obter uma matriz completa.",
        "scopeEmpty": "Nenhum fornecedor corresponde a este perímetro. Nenhuma consulta de documentos foi executada: os contadores acima são zero por construção, não medições.",
        "cellsScope": "células · sobre os {total} fornecedores da base",
        "statusScope": "Filtro de exibição “{status}”: {kept} linha(s) mantida(s) das {shown} exibidas nesta página. Os contadores acima cobrem os {total} fornecedores da base, não esta página.",
        "unsupported": "Filtro(s) não suportado(s) pelo modelo padrão do beCPG: {names}. Configure-os no lado do cliente.",
        "pageOf": "{from}-{to} de {total} fornecedores",
        "previous": "Anterior",
        "next": "Próximo",
        "rows": "Linhas",
        "reminder": "Seu cadastro de fornecedor tem documentos a atualizar no portal: {types}. Envie-os o mais breve possível.",
        "reminderGeneric": "Seu cadastro de fornecedor tem documentos obrigatórios ausentes ou expirados. Atualize-os no portal.",
        "hintTypes": "{count} tipo(s) de documento visado(s)"
    },
    "app/monitor/layout#LABELS": {
        "metaTitle": "Monitoramento de fornecedores — beCPG",
        "metaDescription": "A base de fornecedores em resumo: conformidade documental e projetos",
        "title": "Espaço de monitoramento",
        "denied": "O espaço de monitoramento é reservado às equipes internas",
        "deniedGroups": "Sua conta não pertence a nenhum dos grupos beCPG que dão acesso ao espaço de monitoramento: {groups}. Solicite a inclusão ao seu administrador beCPG.",
        "backSupplier": "Ir para meu painel"
    },
    "app/monitor/page#LABELS": {
        "title": "Monitoramento da base de fornecedores",
        "description": "Homologação, conformidade documental, vencimentos, projetos e não conformidades da sua base, em tempo real.",
        "generatedAt": "Dados de {time}",
        "openList": "Ver a lista completa",
        "openDocuments": "Conformidade documental",
        "openCampaigns": "Projetos",
        "openQuality": "Não conformidades",
        "truncated": "Base maior que a janela de leitura: {scanned} fornecedores lidos de {total}. Os contadores marcados com “≈” são limitados; a distribuição e o top 10 cobrem a janela.",
        "truncatedShort": "Janela: {scanned} fornecedores lidos"
    },
    "app/monitor/products/page#LABELS": {
        "title": "Produtos de fornecedores",
        "subtitle": "Os produtos confiados a um fornecedor. Filtre pela data do certificado para ver o que precisa ser renovado.",
        "search": "Pesquisar um produto, um código, uma razão social…",
        "state": "Estado do produto",
        "anyState": "Todos os estados",
        "certified": "Data do certificado",
        "anyCertified": "Todos",
        "certifiedNone": "Sem data",
        "certifiedYears": "Certificado há mais de {count} ano(s)",
        "columns": {
            "name": "Produto",
            "code": "Código",
            "supplierRef": "Referência do fornecedor",
            "suppliers": "Fornecedor(es)",
            "plants": "Unidades do fornecedor",
            "state": "Estado",
            "certificate": "Data do certificado",
            "modified": "Atualizado"
        },
        "age": "há {count} ano(s)",
        "ageMonths": "há {count} mês(es)",
        "none": "—",
        "empty": "Nenhum produto neste perímetro",
        "emptyHint": "Nenhuma entidade de produto possui o aspecto fornecedor com estes filtros. Os produtos aparecem aqui assim que um fornecedor é vinculado a eles.",
        "pageOf": "{from} - {to} de {total}",
        "previous": "Página anterior",
        "next": "Próxima página",
        "rows": "Linhas por página",
        "sortScope": "A ordenação se aplica à página exibida, não à base inteira."
    },
    "app/monitor/quality/page#LABELS": {
        "title": "Não conformidades",
        "subtitle": "NCs de fornecedores, prazo de tratamento e andamento das ações corretivas. Selecione NCs para lembrar, escalar ou suspender os fornecedores envolvidos.",
        "stats": {
            "open": "NCs abertas",
            "blocking": "Bloqueantes",
            "overdue": "Prazo-alvo ultrapassado",
            "delay": "Prazo médio"
        },
        "hints": {
            "total": "{count} no total",
            "blocking": "Torna o status de homologação “suspenso”",
            "noBlocking": "Nenhuma homologação bloqueada por uma NC",
            "actionsLate": "{count} ação(ões) corretiva(s) atrasada(s)",
            "noActionsLate": "Nenhuma ação corretiva atrasada",
            "closing": "Encerramento médio {value} d",
            "noClosing": "Nenhuma NC encerrada neste perímetro",
            "closingHidden": "{count} NC encerrada(s) — marque “Incluir NCs encerradas” para ver o prazo de encerramento"
        },
        "dayUnit": "d",
        "allStates": "Todos os estados",
        "allTypes": "Todos os tipos",
        "includeClosed": "Incluir NCs encerradas",
        "searchSupplier": "Filtrar por fornecedor",
        "truncated": "Mais NCs do que a janela de leitura ({scanned} analisadas): restrinja os filtros para uma visão completa.",
        "inexact": "Contadores aproximados: o mecanismo retornou um total limitado em pelo menos uma consulta.",
        "scopeEmpty": "Nenhum fornecedor corresponde a este perímetro. Nenhuma consulta foi executada: os contadores acima são zero por construção, não medições.",
        "unsupported": "Filtro(s) não suportado(s) pelo modelo padrão do beCPG: {names}. Configure-os no lado do cliente.",
        "pageOf": "{from}-{to} de {total} NCs",
        "previous": "Anterior",
        "next": "Próximo",
        "rows": "Linhas",
        "reminder": "Uma não conformidade aberta diz respeito a você. Trate as ações corretivas relacionadas no portal o mais breve possível.",
        "hintTargets": "Fornecedores das NCs selecionadas",
        "note": "Prazo de tratamento: desde a criação da NC; para uma NC encerrada, entre sua criação e sua última modificação — o beCPG não armazena data de encerramento."
    },
    "app/monitor/suppliers/[id]/page#LABELS": {
        "unavailable": {
            "title": "Dados indisponíveis",
            "message": "O beCPG não conseguiu retornar este bloco: a lista vazia não diz nada sobre este fornecedor."
        },
        "back": "Fornecedores",
        "startCampaign": "Iniciar um projeto",
        "notFound": "Fornecedor não encontrado",
        "notFoundHint": "Este fornecedor não existe ou está fora do seu perímetro: o portal nunca revela um nó que seus direitos no beCPG não cobrem.",
        "kpi": {
            "approval": "Status de homologação",
            "completion": "Completude",
            "documents": "Documentos obrigatórios",
            "nc": "NCs bloqueantes",
            "campaigns": "Projetos abertos"
        },
        "kpiHints": {
            "derived": "Calculado, nunca armazenado",
            "documents": "{expired} expirado(s) · {expiring} a expirar · {missing} ausente(s)",
            "completion": "{count} catálogo(s) ativo(s)",
            "campaigns": "{late} atrasado(s)",
            "cached": "status fornecido a partir do cache"
        },
        "why": {
            "title": "Por que este status",
            "subtitle": "As linhas que determinam o status",
            "empty": "Nenhuma anomalia: documentos obrigatórios válidos, nenhuma NC bloqueante, nenhum catálogo bloqueante.",
            "more": "… e mais {count}",
            "entity": "em {name}",
            "priority": "prioridade {priority}",
            "catalog": "Catálogo bloqueante não atendido"
        },
        "documents": {
            "title": "Documentos",
            "subtitle": "Documentos esperados e datas de validade",
            "empty": "Nenhum documento esperado ou fornecido para este fornecedor",
            "mandatory": "obrigatório",
            "download": "Baixar",
            "summary": "{satisfied}/{mandatory} obrigatórios atendidos · {total} documentos"
        },
        "products": {
            "title": "Produtos vinculados",
            "subtitle": "Entidades vinculadas ao fornecedor",
            "empty": "Nenhum produto vinculado",
            "emptyHint": "Somente produtos arquivados sob o fornecedor, ou vinculados a um de seus projetos ou documentos, podem ser encontrados: uma entidade vinculada por “Fornecedores” e arquivada em outro local não é indexada pelo Alfresco."
        },
        "subSuppliers": {
            "title": "Subfornecedores",
            "empty": "Nenhum subfornecedor declarado"
        },
        "projects": {
            "title": "Projetos abertos",
            "empty": "Nenhum projeto aberto",
            "manager": "Responsável: {name}",
            "due": "Vencimento {date}",
            "late": "Atrasado",
            "unanswered": "Sem resposta há {days} dias"
        },
        "activity": {
            "title": "Histórico de trocas",
            "empty": "Nenhuma troca registrada",
            "message": "Mensagem",
            "activity": "Atividade"
        },
        "process": {
            "title": "Iniciar um processo",
            "hint": "Referenciamento, renovação, abertura de uma NC… conforme o que a instância permite.",
            "none": "Nenhum processo é permitido nesta instância (PORTAL_PROCESS_TEMPLATES).",
            "launch": "Iniciar",
            "confirmTitle": "Iniciar “{process}”?",
            "confirmMessage": "Um projeto beCPG será criado para este fornecedor a partir do modelo autorizado. Um processo iniciado não pode ser cancelado pelo portal.",
            "started": "Processo iniciado."
        },
        "identity": {
            "code": "Código",
            "erpCode": "Código ERP",
            "legalName": "Razão social",
            "state": "Estado beCPG",
            "family": "Família",
            "subFamily": "Subfamília",
            "sites": "Unidades",
            "subsidiaries": "Filiais",
            "buyer": "Comprador responsável",
            "email": "Contato",
            "lastActivity": "Última atividade",
            "parent": "Fornecedor principal",
            "none": "—"
        },
        "generatedAt": "Dados de {time}"
    },
    "app/monitor/suppliers/page#LABELS": {
        "title": "Fornecedores",
        "statuses": {
            "suspended": "Suspenso",
            "toRenew": "A renovar",
            "inProgress": "Em andamento",
            "approved": "Homologado"
        },
        "statusFiltered": "Filtro ativo",
        "export": "Exportar (CSV)",
        "exportCutTitle": "Exportação incompleta: {scanned} linhas de {total}",
        "exportCutMessage": "O beCPG limita uma listagem a 250 linhas por consulta, portanto a exportação cobre a janela lida, não a base inteira. Restrinja os filtros (família, comprador, status) e exporte em lotes para obter um arquivo completo.",
        "exportCutConfirm": "Exportar a janela",
        "generatedAt": "Dados de {time}",
        "windowOf": "{from}-{to} de {total} fornecedores",
        "previous": "Janela anterior",
        "next": "Próxima janela",
        "truncated": "Base maior que a janela de leitura ({scanned} lidos de {total}): a ordenação e a classificação cobrem essa janela. Restrinja os filtros para uma classificação exata de toda a base.",
        "sortScope": "Ordenado dentro da janela lida",
        "sortedBy": "Ordenação inicial: {sort}",
        "reminder": "Olá,\n\nSeu cadastro de fornecedor precisa ser atualizado (documentos obrigatórios ausentes, expirados ou pendentes).\nAcesse o portal para completá-lo.\n\nAtenciosamente,",
        "countsScope": "Distribuição sobre os {scanned} fornecedores lidos",
        "sortNames": {
            "risk": "risco, decrescente",
            "name": "nome",
            "code": "código",
            "status": "status de homologação",
            "completion": "completude",
            "expiring": "documentos a expirar",
            "expired": "documentos expirados",
            "nc": "NCs abertas",
            "lastActivity": "última atividade",
            "buyer": "comprador"
        },
        "truncatedShort": "Janela: {scanned} fornecedores lidos"
    },
    "app/not-found#LABELS": {
        "title": "Página não encontrada",
        "message": "Este endereço não existe, ou o item ao qual ele aponta não está mais acessível. Se você chegou por um e-mail, o link pode ter expirado.",
        "home": "Voltar ao início"
    },
    "app/products/[id]/page#LABELS": {
        "sheet": "Ficha",
        "notFound": "Produto não encontrado",
        "notFoundHint": "Esta ficha não existe ou não faz parte do seu escopo.",
        "back": "Meus produtos",
        "partial": "Esta ficha é exibida incompleta: ela aponta para pelo menos um dado que sua conta não tem permissão para ler. Os campos envolvidos não aparecem na tela — o que não significa que estejam vazios. Solicite acesso ao seu interlocutor beCPG se precisar de algum deles.",
        "request": "Solicitar uma atualização"
    },
    "app/products/page#LABELS": {
        "title": "Meus produtos",
        "search": "Pesquisar um produto",
        "allStates": "Todos os estados",
        "allTypes": "Todos os tipos",
        "branch": "Atualização",
        "branchFrom": "Atualização da versão {version}",
        "columns": {
            "name": "Produto",
            "code": "Código",
            "type": "Tipo",
            "state": "Estado",
            "completion": "Completude",
            "project": "Projeto",
            "supplierRef": "Referência do fornecedor",
            "certificateDate": "Data do certificado",
            "modified": "Atualizado",
            "actions": "Ações"
        },
        "stats": {
            "total": "Produtos",
            "valid": "Validados",
            "pending": "Em andamento",
            "completion": "Completude média"
        },
        "empty": "Nenhum produto",
        "emptyHint": "Nenhum produto está vinculado a você ainda. Uma ficha aparece aqui assim que o cliente atribuí-la a você.",
        "request": "Solicitar uma atualização"
    },
    "app/specs/page#LABELS": {
        "title": "Especificações",
        "stats": {
            "specs": "Especificações",
            "products": "Produtos cobertos"
        },
        "emptyHint": "Nenhuma especificação está disponível para você. O cliente compartilhará uma, se alguma se aplicar."
    },
    "app/tasks/[id]/page#LABELS": {
        "loading": "Tarefa",
        "notFound": "Tarefa não encontrada",
        "notFoundHint": "Esta tarefa não existe mais, já foi tratada ou não faz parte do seu escopo.",
        "back": "Minhas tarefas",
        "noEntity": "Esta tarefa não aponta para nenhuma ficha",
        "noEntityHint": "O entregável vinculado a esta tarefa não referencia nenhum produto. Entre em contato com seu cliente pela discussão do projeto.",
        "documents": "Documentos a fornecer",
        "viewDocument": "Ver o documento",
        "due": "Vence em {date}",
        "late": "Atrasada",
        "done": "Concluída",
        "discussion": "Discussão"
    },
    "app/tasks/page#LOCAL": {
        "title": "Minhas tarefas",
        "search": "Pesquisar uma tarefa, um produto, um código…",
        "anyType": "Todos os tipos",
        "anyPriority": "Todas as prioridades",
        "anyProduct": "Todos os produtos",
        "anyDue": "Todos os vencimentos",
        "dueLate": "Atrasadas",
        "dueToday": "Hoje",
        "dueWeek": "Em até 7 dias",
        "dueMonth": "Em até 30 dias",
        "dueNone": "Sem data de vencimento",
        "stateOpen": "Em andamento",
        "stateDone": "Concluídas",
        "colTask": "Tarefa",
        "colProduct": "Produto / cliente",
        "colType": "Tipo",
        "colPriority": "Prioridade",
        "colDue": "Vencimento",
        "colProgress": "Progresso",
        "kpiTotal": "Tarefas",
        "kpiLate": "Atrasadas",
        "kpiNext": "Próximo vencimento",
        "kpiNone": "Nenhum",
        "reset": "Redefinir",
        "empty": "Nenhuma tarefa",
        "emptyHint": "Nada é esperado de você no momento.",
        "emptyFiltered": "Nenhuma tarefa corresponde a estes filtros.",
        "truncated": "Somente as primeiras tarefas são exibidas. Restrinja os filtros para ver as demais.",
        "scoped": "Escopo: {supplier}.",
        "scopedAll": "Escopo: todos os fornecedores.",
        "orphans": "{count} tarefa(s) não está(ão) vinculada(s) a nenhuma de suas fichas de fornecedor e não aparece(m) aqui. Escolha “Todos os fornecedores” no canto superior direito para vê-las.",
        "priorityHigh": "Alta",
        "priorityMedium": "Média",
        "priorityLow": "Baixa",
        "noPriority": "Sem prioridade",
        "untitled": "Tarefa sem título",
        "caption": "Minha lista de tarefas"
    },
    "components/dashboard/ActionsCard#LOCAL": {
        "title": "Ações necessárias",
        "open": "tarefa(s) aberta(s)",
        "late": "{count} atrasada(s)",
        "onTime": "Nenhuma atrasada",
        "nextDue": "Próximo vencimento: {date}",
        "noDue": "Nenhum vencimento previsto",
        "none": "Nada a fazer no momento",
        "all": "Ver todas as minhas tarefas"
    },
    "components/dashboard/ActionsCard#TASK_TYPE_META.wizard": "Assistente",
    "components/dashboard/ActionsCard#TASK_TYPE_META.signature": "Assinatura",
    "components/dashboard/ActionsCard#TASK_TYPE_META.document": "Documento",
    "components/dashboard/ActionsCard#TASK_TYPE_META.review": "Revisão",
    "components/dashboard/ApprovalCard#REASONS": {
        "documentExpired": "Documento obrigatório expirado",
        "documentExpiring": "Documento próximo da expiração",
        "documentMissing": "Documento esperado não fornecido",
        "documentRefused": "Documento recusado",
        "catalogIncomplete": "Ficha incompleta",
        "openProject": "Projeto de referenciamento aberto",
        "openNonConformity": "Não conformidade aberta"
    },
    "components/dashboard/ApprovalCard#LOCAL": {
        "title": "Status de homologação",
        "validUntil": "Válido até {date}",
        "noValidity": "Nenhum prazo conhecido",
        "why": "Por quê?",
        "unknown": "Status indisponível",
        "unknownHint": "Não foi possível calcular o status. Tente novamente mais tarde.",
        "allGood": "Nada está bloqueando"
    },
    "components/dashboard/CompletionCard#LOCAL": {
        "title": "Completude",
        "scope": "{scored} de {total} produto(s) avaliado(s)",
        "noScore": "Nenhum catálogo avaliado ainda",
        "noScoreHint": "A completude aparece assim que um produto é formulado.",
        "seeProducts": "Ver meus produtos",
        "worst": "Catálogos menos completos"
    },
    "components/dashboard/DiscussionList#LOCAL": {
        "title": "Minhas discussões",
        "empty": "Nenhuma discussão",
        "emptyHint": "As observações do seu cliente sobre suas tarefas e produtos aparecerão aqui.",
        "all": "Ver tudo",
        "messages": "{count} mensagem(ns)",
        "anonymous": "Usuário",
        "onField": "em {field}",
        "unread": "Nova",
        "unreadCount": "{count} não lida(s)"
    },
    "components/dashboard/DocumentList#LOCAL": {
        "title": "Meus documentos",
        "empty": "Nenhum documento esperado",
        "emptyHint": "Os certificados exigidos pelo seu cliente aparecerão aqui.",
        "all": "Ver tudo",
        "supplierScope": "Fornecedor",
        "mandatory": "Obrigatório",
        "until": "Até {date}",
        "expiredSince": "Expirado há {days} d",
        "expiresIn": "Expira em {days} d",
        "noValidity": "Sem data de fim",
        "upload": "Enviar uma nova versão",
        "uploadFirst": "Enviar o documento",
        "download": "Baixar",
        "uploading": "Enviando…",
        "uploaded": "Documento enviado. Ele agora aguarda a validação do seu cliente."
    },
    "components/dashboard/DocumentsCard#LOCAL": {
        "title": "Documentos",
        "valid": "Válidos",
        "expiring": "Expiram em < {days} d",
        "expired": "Expirados",
        "missing": "Ausentes",
        "refused": "Recusados",
        "total": "{count} documento(s) acompanhado(s)",
        "none": "Nenhum documento acompanhado",
        "unavailable": "O acompanhamento de documentos não está disponível nesta instância.",
        "all": "Ver meus documentos",
        "toHandle": "a tratar"
    },
    "components/dashboard/NotificationList#NOTIFICATION_LABELS": {
        "title": "Minhas notificações",
        "empty": "Nenhuma notificação",
        "emptyHint": "Nada requer sua atenção no momento.",
        "overdue": "{days} d de atraso",
        "expiresIn": "Em {days} d",
        "types": {
            "task.overdue": "Tarefa atrasada",
            "document.expired": "Documento expirado",
            "document.expiring": "Documento a renovar",
            "document.missing": "Documento ausente",
            "document.refused": "Documento recusado"
        },
        "assigned": "Atribuída a mim",
        "mandatory": "Obrigatório",
        "isNew": "Nova",
        "scopeEmpty": {
            "noSupplierIdentity": "Sua conta não está vinculada a nenhum fornecedor, portanto seus documentos não podem ser identificados. Somente suas tarefas são listadas. Informe seu interlocutor no cliente.",
            "internalAccount": "Conta interna: os alertas de documentos seguem o fornecedor responsável por eles, portanto seu sino lista apenas suas tarefas. A visão de toda a base está em Conformidade documental.",
            "fallback": "O perímetro da sua conta está vazio: alguns alertas não podem ser calculados."
        },
        "countTitle": "{total} pendente(s) · as {shown} mais urgentes abaixo"
    },
    "components/dashboard/ProductList#LOCAL": {
        "title": "Meus produtos",
        "empty": "Nenhum produto",
        "emptyHint": "Os produtos que seu cliente confia a você aparecerão aqui.",
        "all": "Ver tudo",
        "updatedOn": "Atualizado em {date}",
        "request": "Solicitar uma atualização",
        "noCompletion": "Não avaliado",
        "completion": "Completude"
    },
    "components/dashboard/ProductList#STATE_LABELS": {
        "Valid": "Aprovado",
        "ToValidate": "Aguardando aprovação",
        "Refused": "A corrigir",
        "Simulation": "Rascunho",
        "Stopped": "Interrompido",
        "Archived": "Arquivado"
    },
    "components/dashboard/TaskList#LOCAL": {
        "title": "Minhas tarefas",
        "empty": "Nenhuma tarefa em andamento",
        "emptyHint": "Tudo está em dia. As novas solicitações do cliente aparecerão aqui.",
        "all": "Ver tudo",
        "overdue": "{days} d de atraso",
        "overdueToday": "Vence hoje",
        "dueIn": "Em {days} d",
        "noDue": "Sem data de vencimento",
        "priorityHigh": "Alta",
        "priorityMedium": "Média",
        "priorityLow": "Baixa",
        "progress": "Progresso",
        "untitled": "Tarefa sem título"
    },
    "components/datalist/RowFormModal#LABELS": {
        "title": "Editar a linha",
        "create": "Nova linha",
        "save": "Salvar",
        "cancel": "Cancelar",
        "description": "Os campos que a grade não exibe são preenchidos aqui.",
        "refused": "A linha não foi salva. Verifique os campos obrigatórios e tente novamente."
    },
    "components/datalist/useDataList#DATALIST_LABELS": {
        "rows": "{count} linha(s)",
        "addRow": "Adicionar uma linha",
        "deleteRow": "Excluir a linha",
        "editRow": "Editar a linha",
        "moveUp": "Mover para cima",
        "moveDown": "Mover para baixo",
        "actions": "Ações",
        "order": "Ordem",
        "row": "Linha {index}",
        "newRow": "Nova linha",
        "totalRow": "Linha de total, calculada pelo beCPG",
        "incomplete": "Preencha os campos obrigatórios para salvar esta linha",
        "sortBy": "Ordenar por {column}",
        "saving": "Salvando…",
        "saved": "Salvo",
        "discard": "Descartar as alterações",
        "failed": "Falha ao salvar",
        "retry": "Tentar novamente",
        "deleting": "Excluindo…",
        "search": "Pesquisar na lista",
        "readOnly": "Somente leitura",
        "frozenTitle": "Lista validada pelo seu cliente",
        "frozenText": "Seu cliente validou esta lista: ela agora está congelada e não pode mais ser modificada. Se for necessária uma correção, solicite a reabertura pela discussão do projeto.",
        "readAccessTitle": "Somente consulta",
        "readAccessText": "Você tem apenas acesso de leitura a esta entidade.",
        "noTaskTitle": "Nenhuma tarefa aberta",
        "noTaskText": "A edição só fica disponível enquanto houver uma tarefa atribuída a você. Esta lista continua visível.",
        "wizardReadOnlyTitle": "Assistente em somente leitura",
        "wizardReadOnlyText": "Este assistente está configurado para consulta: nenhuma alteração é possível.",
        "protectedTitle": "Campo protegido",
        "protectedText": "A coluna “{column}” está protegida: seu valor alimenta as verificações de conformidade do seu cliente. Confirme que deseja alterá-la.",
        "protectedUnlock": "Alterar mesmo assim",
        "protectedLocked": "Campo protegido — clique para desbloquear",
        "deleteTitle": "Excluir esta linha?",
        "deleteText": "Esta linha será removida definitivamente da lista.",
        "expand": "Mostrar detalhes",
        "collapse": "Ocultar detalhes",
        "nestedEmpty": "Nenhum item",
        "empty": "Esta lista está vazia",
        "emptyHint": "Adicione uma primeira linha para começar.",
        "emptyReadOnly": "Seu cliente não espera nenhuma linha nesta lista.",
        "mandatory": "Campo obrigatório",
        "detail": "Detalhe",
        "duplicate": "Duplicar esta linha",
        "select": "Selecionar",
        "selectRow": "Selecionar a linha {index}",
        "selectAll": "Selecionar todas as linhas desta página",
        "selected": "{count} linha(s) selecionada(s)",
        "clearSelection": "Limpar a seleção",
        "bulkMoveUp": "Mover para cima",
        "bulkMoveUpLong": "Mover a seleção para cima",
        "bulkMoveDown": "Mover para baixo",
        "bulkMoveDownLong": "Mover a seleção para baixo",
        "bulkDuplicate": "Duplicar",
        "bulkDuplicateLong": "Duplicar a seleção",
        "bulkDelete": "Excluir",
        "bulkDeleteLong": "Excluir a seleção",
        "accessDenied": "Acesso negado",
        "accessDeniedRow": "Esta linha contém uma característica que sua conta não tem permissão para ler: ela não pode ser editada aqui.",
        "bulkEdit": "Editar",
        "bulkEditLong": "Editar a seleção",
        "bulkEditTitle": "Editar {count} linha(s)",
        "bulkEditDescription": "Os mesmos valores, em todas as linhas selecionadas, em uma única gravação.",
        "bulkEditPickFields": "Campos a preencher",
        "bulkEditSearchField": "Pesquisar um campo",
        "bulkEditApply": "Aplicar a {count} linha(s)",
        "bulkEditCancel": "Cancelar",
        "bulkEditEmptyClears": "Um campo marcado mas deixado vazio apaga o valor em todas as linhas.",
        "bulkEditSkipped": "{count} linha(s) selecionada(s) não pode(m) ser editada(s) e será(ão) mantida(s) como está(ão).",
        "bulkEditTooMany": "{count} linhas selecionadas, o máximo é {max}. Reduza a seleção.",
        "bulkEditNoColumn": "Nenhuma coluna desta lista pode ser preenchida em série.",
        "deleteSelectedTitle": "Excluir {count} linha(s)?",
        "deleteSelectedText": "Estas linhas serão removidas definitivamente da lista.",
        "rowsPerPage": "Linhas por página",
        "shortcuts": "Atalhos de teclado",
        "shortcutsTitle": "Digitar com o teclado",
        "shortcutList": [
            [
                "Tab / Shift+Tab",
                "célula seguinte / anterior"
            ],
            [
                "Enter",
                "salva a linha e desce na mesma coluna"
            ],
            [
                "Enter na última linha",
                "adiciona uma linha"
            ],
            [
                "↑ / ↓",
                "mesma coluna, linha acima / abaixo"
            ],
            [
                "Esc",
                "descarta as alterações da linha em edição"
            ],
            [
                "Ctrl+Enter",
                "adiciona uma linha"
            ],
            [
                "Ctrl+D",
                "duplica a linha atual"
            ],
            [
                "Ctrl+V",
                "cola um bloco de células de uma planilha"
            ]
        ],
        "pasteTitle": "Colado de uma planilha",
        "pasteApplied": "{cells} valor(es) colado(s) em {rows} linha(s), das quais {created} nova(s).",
        "pasteNothing": "Nada pôde ser colado.",
        "pasteUndo": "Desfazer a colagem",
        "pasteSave": "Salvar as {count} linha(s)",
        "pasteResolving": "Buscando os rótulos…",
        "pasteUnmatched": "{count} valor(es) não aceito(s) — corrija-os manualmente:",
        "pasteExtraColumns": "{count} coluna(s) colada(s) além da última coluna da lista: ignorada(s).",
        "pasteRefusedRows": "{count} linha(s) além do fim da lista: esta lista não aceita novas linhas.",
        "pasteLine": "linha {line}",
        "pasteReasons": {
            "number": "era esperado um número",
            "integer": "era esperado um número inteiro",
            "boolean": "era esperado sim / não",
            "date": "era esperada uma data (dd/mm/aaaa)",
            "list": "valor fora da lista proposta",
            "readonly": "a coluna não pode ser alterada",
            "association": "nenhuma correspondência exata nos dados de referência"
        }
    },
    "components/documents/DepositedDocuments#LABELS": {
        "title": "Documentos depositados",
        "subtitle": "Os arquivos presentes na pasta deste produto, qualquer que seja o tipo.",
        "empty": "Nenhum arquivo depositado",
        "emptyHint": "A pasta deste produto ainda não contém nenhum documento.",
        "signed": "Assinado",
        "download": "Baixar",
        "consult": "Visualizar",
        "modified": "Modificado em {date}"
    },
    "components/documents/DocumentUpload#LABELS": {
        "drop": "Solte um arquivo aqui",
        "or": "ou",
        "browse": "Procurar",
        "deposit": "Enviar",
        "renew": "Renovar",
        "replace": "Substituir",
        "uploading": "Enviando…",
        "analysing": "Analisando o documento…",
        "done": "Arquivo enviado",
        "doneHint": "Ele será analisado pelo cliente. Nada mais é esperado de você.",
        "retry": "Tentar novamente",
        "cancel": "Cancelar",
        "tooLarge": "Arquivo muito grande ({size}). Máximo: {max}.",
        "badType": "Formato não suportado ({name}). Esperado: {accept}.",
        "empty": "O arquivo está vazio.",
        "failed": "O envio falhou.",
        "locked": "Envio indisponível",
        "accepted": "Formatos: {accept} — máx. {max}",
        "aiValid": "Verificado pela IA",
        "aiToValidate": "A verificar",
        "aiRefused": "Rejeitado pela IA",
        "aiOn": "Analisado em {date}",
        "selected": "Arquivo selecionado",
        "validityHint": "As datas de validade impressas no documento.",
        "validityInverted": "A data de fim é anterior à data de início.",
        "validityMissing": "Preencha o fim da validade antes de enviar o arquivo.",
        "validityNotApplied": "O arquivo foi enviado, mas suas datas de validade não foram salvas. Preencha-as na linha do documento."
    },
    "components/documents/DocumentValidity#LABELS": {
        "fromTo": "Válido de {from} a {to}",
        "from": "Válido desde {from}",
        "to": "Válido até {to}",
        "none": "Sem data de validade",
        "required": "Validade a preencher",
        "expired": "Validade expirada em {to}",
        "fromLabel": "Válido de",
        "toLabel": "Válido até",
        "edit": "Editar",
        "setDates": "Preencher",
        "save": "Salvar",
        "cancel": "Cancelar",
        "saved": "Validade salva",
        "inverted": "A data de fim é anterior à data de início.",
        "hint": "As datas impressas no documento que você está enviando."
    },
    "components/documents/DocumentViewer#LABELS": {
        "title": "Documento",
        "download": "Baixar",
        "close": "Fechar",
        "unsupported": "Sem pré-visualização para este tipo de arquivo",
        "unsupportedHint": "Este formato não pode ser pré-visualizado no navegador. Baixe-o para lê-lo.",
        "failed": "Não foi possível exibir o documento",
        "failedHint": "Ele ainda pode ser baixado."
    },
    "components/documents/ExpiryPill#LABELS": {
        "missing": "A fornecer",
        "refused": "Recusado",
        "toValidate": "Em análise",
        "valid": "Válido",
        "validUntil": "Válido até {date}",
        "expiredOn": "Expirado em {date}",
        "expiredSince": "Expirado há {days} dias",
        "expiresToday": "Expira hoje",
        "expiresIn": "Expira em {days} dias",
        "noDate": "Sem data de validade",
        "from": "De",
        "to": "a",
        "since": "Desde",
        "until": "Até"
    },
    "components/documents/RequirementChecklist#LABELS": {
        "mandatory": "Obrigatório",
        "satisfied": "Fornecido",
        "upload": "Enviar",
        "renew": "Renovar",
        "replace": "Substituir",
        "download": "Baixar",
        "consult": "Visualizar",
        "details": "Detalhes",
        "hide": "Ocultar",
        "of": "{done} / {total} documentos obrigatórios",
        "allDone": "Tudo está em dia",
        "allDoneHint": "Nada é esperado de você no momento.",
        "nothing": "Nenhuma exigência documental",
        "nothingHint": "O cliente ainda não definiu nenhum documento esperado para este escopo.",
        "openCount": "{count} a tratar",
        "blockingCount": "{count} obrigatório(s) a corrigir",
        "category": "Categoria",
        "readOnly": "Os envios estão encerrados nesta ficha.",
        "noEntity": "Documentos do fornecedor",
        "aiHints": "Notas de análise",
        "deposit": "Enviar um arquivo",
        "file": "Arquivo"
    },
    "components/documents/SignedDocumentList#LABELS": {
        "document": "Documento assinado",
        "signedAt": "Assinado em",
        "download": "Baixar",
        "search": "Pesquisar um documento assinado",
        "empty": "Nenhum documento assinado",
        "emptyHint": "Os documentos que você assina a partir de suas tarefas aparecem aqui.",
        "truncated": "Lista parcial: nem todos os documentos assinados puderam ser lidos."
    },
    "components/form/FieldRenderer#LABELS": {
        "add": "Adicionar um valor",
        "remove": "Remover este valor"
    },
    "components/form/FormRenderer#LABELS": {
        "empty": "Nenhum campo a preencher",
        "emptyHint": "A configuração deste formulário não retorna nenhum campo."
    },
    "components/form/controls/AutocompleteControl#LABELS": {
        "search": "Pesquisar…",
        "hint": "Digite um nome ou código para filtrar os dados",
        "loading": "Pesquisando…",
        "noResult": "Nenhum resultado",
        "clear": "Limpar",
        "remove": "Remover",
        "browse": "Mostrar os valores",
        "error": "A pesquisa falhou",
        "errorUnconfigured": "Este campo não tem lista de valores configurada. Informe seu interlocutor no cliente.",
        "showing": "Exibindo itens 1 - {count} de {total}",
        "favourite": "Favorito"
    },
    "components/form/controls/BooleanControl#LABELS": {
        "yes": "Sim",
        "no": "Não",
        "empty": "(vazio)"
    },
    "components/form/controls/MlTextControl#LABELS": {
        "more": "{count} outro(s) idioma(s)",
        "less": "Ocultar os outros idiomas",
        "required": "exigido pelo cliente",
        "missing": "{count} idioma(s) obrigatório(s) ainda vazio(s)"
    },
    "components/form/controls/NumberUnitControl#DURATION_SYMBOLS": {
        "d": "dias",
        "mo": "meses",
        "y": "anos"
    },
    "components/form/controls/NumberUnitControl#LABELS": {
        "unit": "Unidade"
    },
    "components/form/controls/ReadOnlyControl#LABELS": {
        "yes": "Sim",
        "no": "Não",
        "empty": "—"
    },
    "components/form/controls/SelectControl#LABELS": {
        "placeholder": "Escolha…",
        "offList": "valor fora da lista",
        "empty": "Nenhum valor disponível"
    },
    "components/form/controls/SizeControl#LABELS": {
        "bytes": "bytes"
    },
    "components/form/validation#VALIDATION_MESSAGES": {
        "validation.required": "Este campo é obrigatório.",
        "validation.number": "Informe um número.",
        "validation.integer": "Informe um número inteiro.",
        "validation.date": "Informe uma data válida.",
        "validation.boolean": "Informe sim ou não.",
        "validation.list": "Escolha um valor da lista.",
        "validation.regex": "O formato esperado não foi respeitado.",
        "validation.min": "O valor deve ser maior ou igual a {min}.",
        "validation.max": "O valor deve ser menor ou igual a {max}.",
        "validation.range": "O valor deve estar entre {min} e {max}.",
        "validation.minLength": "Informe pelo menos {min} caractere(s).",
        "validation.maxLength": "Informe no máximo {max} caractere(s)."
    },
    "components/monitor/BulkActionBar#LABELS": {
        "selected": "{count} fornecedor selecionado",
        "selectedPlural": "{count} fornecedores selecionados",
        "clear": "Limpar a seleção",
        "overflow": "Somente os {max} primeiros serão processados.",
        "loading": "Carregando as ações…",
        "unavailable": "Nenhuma ação está disponível para o seu perfil.",
        "actions": {
            "remind": "Lembrar",
            "escalate": "Escalar",
            "suspend": "Suspender"
        },
        "confirm": {
            "remind": "Lembrar {count} fornecedor(es)",
            "escalate": "Escalar {count} fornecedor(es)",
            "suspend": "Suspender {count} fornecedor(es)"
        },
        "mechanism": {
            "remind": "A mensagem é publicada no fio de discussão do fornecedor — o mesmo que o portal e o Share já exibem. Nenhum outro canal é criado.",
            "escalate": "A mensagem é publicada internamente no projeto aberto do fornecedor, mencionando o gerente do projeto. O fornecedor não a vê. Sem projeto aberto, nada é publicado.",
            "suspend": "O status de homologação é calculado, nunca armazenado: a suspensão inicia o processo de suspensão configurado no beCPG. O status muda por si só."
        },
        "message": "Mensagem",
        "messageRequired": "Uma mensagem é obrigatória.",
        "process": "Processo a iniciar",
        "targets": "Fornecedores envolvidos",
        "andMore": "… e mais {count}",
        "send": "Enviar",
        "suspendConfirm": "Suspender",
        "report": "Resultado da ação",
        "reportOk": "{count} fornecedor(es) processado(s) com sucesso.",
        "reportKo": "{count} falha(s):",
        "reportSkipped": "{count} fornecedor(es) deixado(s) de fora: acima do limite de {max}.",
        "reportNone": "Nenhum fornecedor foi processado.",
        "close": "Fechar",
        "successToast": {
            "remind": "{ok} fornecedor(es) lembrado(s)",
            "escalate": "{ok} escalação(ões) enviada(s)",
            "suspend": "{ok} suspensão(ões) iniciada(s)"
        },
        "successToastFallback": "{ok} fornecedor(es) processado(s)",
        "partialToast": "{ok} processado(s), {ko} com falha",
        "errors": {
            "notFound": "Fornecedor fora do seu perímetro"
        }
    },
    "components/monitor/CampaignList#LABELS": {
        "columns": {
            "campaign": "Projeto",
            "suppliers": "Fornecedores",
            "response": "Taxa de resposta",
            "age": "Idade",
            "silence": "Último lembrete",
            "due": "Vencimento",
            "reminders": "Lembretes",
            "follow": "Acompanhamento",
            "manager": "Responsável"
        },
        "days": "{count} d",
        "since": "Aberto há {count} d",
        "lastActivity": "Última atividade {date}",
        "silenceDays": "há {count} d",
        "silenceToday": "Hoje",
        "silenceHint": "O beCPG não mantém registro de lembretes: esta coluna mostra a última atividade do projeto (cm:modified), o dado mais próximo realmente disponível.",
        "noSilence": "Nenhuma atividade datada",
        "noAnswer": "Sem resposta",
        "late": "Atrasado",
        "onTrack": "No prazo",
        "toRemind": "A lembrar",
        "toEscalate": "A escalar",
        "lateTasks": "{late} / {open} tarefa(s) atrasada(s)",
        "noTasks": "Nenhuma tarefa aberta",
        "dueIn": "Em {count} d",
        "overdue": "{count} d de atraso",
        "noDue": "Sem data de vencimento",
        "others": "+{count}",
        "search": "Pesquisar um projeto",
        "empty": "Nenhum projeto aberto neste perímetro",
        "projectStates": {
            "Planned": "Planejado",
            "InProgress": "Em andamento",
            "OnHold": "Em espera",
            "Completed": "Concluído",
            "Cancelled": "Cancelado"
        }
    },
    "components/monitor/DocumentMatrix#LABELS": {
        "supplier": "Fornecedor",
        "types": "{count} tipo(s) de documento",
        "notApplicable": "Não se aplica a este fornecedor",
        "mandatory": "Obrigatório",
        "expected": "{count} esperado(s)",
        "selectRow": "Selecionar {name}",
        "selectCell": "Selecionar {type} para {name}",
        "download": "Baixar",
        "empty": "Nenhum fornecedor neste perímetro",
        "emptyHint": "Amplie os filtros para ver a matriz.",
        "noColumns": "Nenhum tipo de documento está materializado neste perímetro",
        "noColumnsHint": "O beCPG materializa os documentos esperados durante a formulação: sem exigência documental configurada, a matriz fica vazia.",
        "toggle": "Mostrar os documentos",
        "summary": "{missing} ausente(s) · {expired} expirado(s) · {expiring} a renovar",
        "legend": "Legenda"
    },
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Valid": "Válido",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Simulation": "Rascunho",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.ToValidate": "A validar",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Refused": "Recusado",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Archived": "Arquivado",
    "components/monitor/MonitorFilters#SUPPLIER_STATES.Stopped": "Interrompido",
    "components/monitor/MonitorFilters#LABELS": {
        "search": "Pesquisar um fornecedor, um código, uma razão social…",
        "toggle": "Filtros",
        "reset": "Redefinir",
        "close": "Ocultar os filtros",
        "legend": "Filtros da base",
        "family": "Família",
        "subFamily": "Subfamília",
        "site": "Unidade",
        "subsidiary": "Filial",
        "buyer": "Comprador responsável",
        "market": "Mercado",
        "state": "Estado do fornecedor",
        "any": "Todos",
        "anyBuyer": "Todos os compradores",
        "buyerHint": "Nome de usuário beCPG (cm:owner)",
        "windowScoped": "restrito à janela",
        "windowScopedHelp": "O Alfresco não indexa as associações: este filtro se aplica aos fornecedores já lidos, não à base inteira.",
        "unsupported": "não configurado",
        "unsupportedHelp": "Nenhuma propriedade padrão do beCPG contém esta noção. Ative-a no lado do cliente declarando a propriedade na configuração de monitoramento.",
        "noVocabulary": "Nenhum valor no perímetro carregado",
        "active": "{count} filtro ativo",
        "activePlural": "{count} filtros ativos",
        "clearOne": "Remover este filtro"
    },
    "components/monitor/NonConformityList#LABELS": {
        "columns": {
            "nc": "Não conformidade",
            "suppliers": "Fornecedores",
            "state": "Estado",
            "priority": "Prioridade",
            "delay": "Prazo de tratamento",
            "actions": "Ações corretivas",
            "cost": "Custo"
        },
        "states": {
            "new": "Nova",
            "analysis": "Análise",
            "treatment": "Tratamento",
            "response": "Resposta",
            "classification": "Classificação",
            "closing": "Encerramento",
            "closed": "Encerrada"
        },
        "types": {
            "NonConformity": "Não conformidade",
            "Claim": "Reclamação"
        },
        "priorities": {
            "1": "Alta",
            "2": "Média",
            "3": "Baixa"
        },
        "blocking": "Bloqueante",
        "blockingHint": "Prioridade alta e ainda aberta: é isso que torna o status de homologação calculado “suspenso” (calculado, nunca armazenado).",
        "days": "{count} d",
        "openSince": "Aberta há {count} d",
        "overdue": "Prazo-alvo de tratamento ultrapassado",
        "closedIn": "Tratada em {count} d",
        "closedApprox": "O beCPG não armazena data de encerramento: o prazo de uma NC encerrada é medido entre sua criação e sua última modificação.",
        "createdOn": "Criada em {date}",
        "noDelay": "Sem data de criação",
        "actionsCount": "{done} / {total}",
        "actionsLate": "{count} atrasada(s)",
        "noActions": "Nenhuma ação",
        "noActionsHint": "Nenhuma tarefa de tratamento vinculada a esta NC no beCPG — o plano de ação ainda não foi aberto.",
        "actionState": {
            "done": "concluída",
            "late": "atrasada",
            "open": "em andamento"
        },
        "andMore": "… e mais {count}",
        "others": "+{count}",
        "noSupplier": "Nenhum fornecedor vinculado",
        "search": "Pesquisar uma não conformidade",
        "empty": "Nenhuma não conformidade neste perímetro",
        "open": "Abrir esta não conformidade",
        "detail": {
            "description": "Descrição",
            "comment": "Comentário da qualidade",
            "noText": "Esta não conformidade não possui descrição nem comentário no beCPG.",
            "facts": "Fatos",
            "actions": "Ações corretivas",
            "noActions": "Nenhuma ação corretiva aberta.",
            "suppliers": "Fornecedores envolvidos",
            "discussion": "Discussão",
            "created": "Criada em",
            "modified": "Última modificação",
            "cost": "Custo",
            "priority": "Prioridade",
            "state": "Estado",
            "type": "Tipo"
        }
    },
    "components/monitor/ParkStats#LABELS": {
        "tiles": {
            "approved": "Homologados",
            "toRenew": "A renovar",
            "suspended": "Suspensos",
            "compliance": "Conformidade doc.",
            "expiring30": "Expiram em < 30 d",
            "campaigns": "Projetos",
            "lateTasks": "Tarefas atrasadas",
            "nc": "NCs abertas"
        },
        "hints": {
            "ofPark": "de {total} fornecedores",
            "ofScanned": "dos {scanned} fornecedores lidos",
            "complianceDetail": "{missing} ausente(s) · {expired} expirado(s) · {refused} recusado(s)",
            "complianceMandatory": "{compliant} / {total} documentos obrigatórios",
            "noRate": {
                "countsCapped": "Taxa não calculável: o beCPG limitou a contagem de documentos.",
                "scopeTruncated": "Taxa não calculável: {dropped} fornecedor(es) da base não puderam ser consultados.",
                "emptyScope": "Nenhum fornecedor neste perímetro: não há nada a avaliar."
            },
            "expiring": "documentos · {d60} em 60 d, {d90} em 90 d",
            "campaigns": "abertos · {rate} % respondidos, {late} atrasado(s)",
            "campaignsNoRate": "abertos · nenhuma taxa de resposta a calcular, {late} atrasado(s)",
            "lateTasks": "vencidas",
            "nc": "das quais {blocking} bloqueante(s)",
            "inProgress": "{count} em referenciamento",
            "noNotice": "aviso de {days} d"
        },
        "park": {
            "title": "Composição da base",
            "empty": "Nenhum fornecedor neste perímetro",
            "share": "{share} %",
            "unknown": "{count} fornecedor(es) lido(s) sem status de homologação avaliado: não aparecem em nenhuma das barras.",
            "windowScope": "Distribuição calculada sobre os {scanned} fornecedores lidos (a base contém {total}): restrinja os filtros para uma distribuição exata."
        },
        "expiry": {
            "title": "Horizonte de expiração",
            "cumulative": "Cumulativo: um documento contado em 30 d também é contado em 60 e 90 d.",
            "bucket": "< {days} d",
            "empty": "Nenhum documento expira nos próximos 90 dias",
            "unit": "documentos",
            "seeAll": "Ver a conformidade documental"
        },
        "approx": "Contador aproximado: o beCPG limitou a contagem.",
        "approxShort": "aproximado",
        "scopeEmpty": "Nenhum fornecedor corresponde a este perímetro. Nenhum contador foi calculado: os números acima são zero por construção, não medições.",
        "scopeDropped": "{dropped} fornecedor(es) da base não puderam ser consultados (limite de {chunks} consultas): os contadores são valores mínimos.",
        "unsupported": "Filtro não disponível nesta instância: {names}. Nenhuma propriedade padrão do beCPG o contém.",
        "assocScope": "Filtro {names} aplicado sobre a janela lida (o Alfresco não indexa as associações).",
        "generatedAt": "Dados de {time}"
    },
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.label": "Qualidade",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.quality.focus": "Conformidade documental, não conformidades, certificações, auditorias",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.label": "Compras",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.purchasing.focus": "Status de homologação (bloqueia pedidos), pontuação, capacidade de resposta",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.label": "P&D",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.rnd.focus": "Completude dos dados técnicos, catálogos, especificações",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.label": "RSE",
    "components/monitor/ProfileSwitcher#MONITOR_PROFILES.csr.focus": "Certificações, origens, questionários de RSE",
    "components/monitor/ProfileSwitcher#LABELS": {
        "legend": "Visão por área",
        "hint": "A mesma base, quatro leituras. Reorganiza os cartões e as colunas."
    },
    "components/monitor/RiskList#RISK_REASONS.documentExpired": "{count} documento(s) expirado(s)",
    "components/monitor/RiskList#RISK_REASONS.documentExpiring": "{count} documento(s) a expirar",
    "components/monitor/RiskList#RISK_REASONS.documentMissing": "{count} documento(s) ausente(s)",
    "components/monitor/RiskList#RISK_REASONS.blockingNc": "{count} NC(s) bloqueante(s)",
    "components/monitor/RiskList#RISK_REASONS.openNc": "{count} NC(s) aberta(s)",
    "components/monitor/RiskList#RISK_REASONS.campaignNoAnswer": "{count} projeto(s) sem resposta",
    "components/monitor/RiskList#RISK_REASONS.lateTask": "{count} tarefa(s) atrasada(s)",
    "components/monitor/RiskList#RISK_REASONS.lowCompletion": "Completude baixa ({score} %)",
    "components/monitor/RiskList#RISK_REASONS.scoreDropping": "Pontuação em queda",
    "components/monitor/RiskList#RISK_REASONS.openProject": "{count} referenciamento(s) em andamento",
    "components/monitor/RiskList#RISK_REASONS.blockingCatalog": "Catálogo bloqueante não atendido",
    "components/monitor/RiskList#RISK_LEVELS.critical": "Crítico",
    "components/monitor/RiskList#RISK_LEVELS.high": "Alto",
    "components/monitor/RiskList#RISK_LEVELS.medium": "Médio",
    "components/monitor/RiskList#RISK_LEVELS.low": "Baixo",
    "components/monitor/RiskList#LABELS": {
        "title": "Top 10 fornecedores em risco",
        "empty": "Nenhum fornecedor em risco neste perímetro",
        "emptyHint": "Nenhum documento expirado, NC bloqueante ou projeto sem resposta detectado.",
        "riskScore": "Pontuação de risco {score}",
        "level": "Risco {level}",
        "buyer": "Comprador: {name}",
        "lastActivity": "Última atividade em {date}",
        "completion": "Completude {value} %",
        "openSheet": "Abrir a ficha",
        "actions": {
            "remind": "Lembrar",
            "escalate": "Escalar",
            "suspend": "Suspender"
        },
        "dialog": {
            "remindTitle": "Lembrar {target}",
            "escalateTitle": "Escalar {target}",
            "suspendTitle": "Suspender {target}",
            "messageLabel": "Mensagem",
            "messageHelp": "Publicada no fio de discussão do fornecedor — o mesmo que o portal e o Share exibem. O fornecedor a recebe por meio de suas assinaturas do Alfresco.",
            "escalateHelp": "Publicada internamente no projeto aberto do fornecedor, nunca no fio que o fornecedor lê, mencionando o responsável. Sem projeto aberto, nada é publicado.",
            "messageRequired": "Uma mensagem é obrigatória.",
            "suspendWarning": "O status de homologação é calculado em tempo real, nunca armazenado: esta ação não grava “suspenso”. Ela inicia o processo de suspensão do cliente. Assim que o beCPG registrar a NC bloqueante, o status muda por si só.",
            "suspendIrreversible": "Um processo iniciado não pode ser cancelado pelo portal. Verifique a seleção.",
            "process": "Processo a iniciar",
            "noProcess": "Nenhum processo de suspensão é permitido nesta instância (PORTAL_PROCESS_TEMPLATES).",
            "targets": "{count} fornecedor(es) visado(s):",
            "send": "Enviar",
            "suspendConfirm": "Iniciar a suspensão"
        },
        "result": {
            "ok": "{count} ação(ões) executada(s).",
            "partial": "{ok} com sucesso, {failed} com falha.",
            "failed": "Nenhuma ação teve sucesso."
        },
        "defaults": {
            "remind": "Olá,\n\nSeu cadastro de fornecedor precisa ser atualizado: {reasons}.\nAcesse o portal para completá-lo.\n\nAtenciosamente,",
            "escalate": "Escalação: o cadastro do fornecedor continua com anomalias ({reasons}) apesar dos lembretes.\nAssuma o acompanhamento.",
            "genericReasons": "documentos e prazos pendentes"
        }
    },
    "components/monitor/StartCampaignDialog#LABELS": {
        "title": "Iniciar um projeto",
        "subtitle": "Um projeto de referenciamento por produto, como faz “Enviar ao fornecedor” no beCPG.",
        "supplier": "Fornecedor",
        "supplierPlaceholder": "Escolha um fornecedor…",
        "scope": "Escopo",
        "scopeAll": "Todos os produtos deste fornecedor",
        "scopeOne": "Um produto",
        "entity": "Produto",
        "entityPlaceholder": "Escolha um produto…",
        "process": "Modelo de projeto",
        "processPlaceholder": "Escolha um modelo…",
        "start": "Iniciar",
        "cancel": "Cancelar",
        "starting": "Iniciando…",
        "noEntity": "Nenhum produto está vinculado a este fornecedor: nada a enviar.",
        "noProcess": "Nenhum modelo de projeto está disponível para o portal nesta instância.",
        "countAll": "{count} produto(s) será(ão) enviado(s), um projeto para cada.",
        "done": "{count} projeto(s) iniciado(s)",
        "partial": "{done} iniciado(s), {failed} com falha",
        "failedTitle": "Estes produtos não foram iniciados",
        "countTruncated": "Somente {count} de {total} produtos podem ser listados aqui: estes, e apenas estes, serão enviados.",
        "suppliersTruncated": "Somente {count} de {total} fornecedores são oferecidos. Inicie o projeto pela página do fornecedor se ele não estiver na lista.",
        "atLeast": "pelo menos {count}",
        "loadFailed": "Não foi possível carregar a lista.",
        "retry": "Tentar novamente"
    },
    "components/monitor/SupplierScorecard#LABELS": {
        "title": "Scorecard",
        "subtitle": "Critérios, pesos e pontuações — configurados no lado do cliente",
        "weighted": "Pontuação ponderada",
        "weightedHint": "{count} critérios · peso total {weight}",
        "criterion": "Critério",
        "weight": "peso {weight}",
        "weightShare": "{share} % do total",
        "range": "escala {range}",
        "noScore": "Não avaliado",
        "scaleNote": "Escala deduzida da configuração (ou da maior pontuação observada): a pontuação bruta é sempre exibida.",
        "unavailable": "Nenhum scorecard para este fornecedor",
        "unavailableHint": "Os scorecards são alimentados pelas pontuações dos projetos de fornecedor. Nenhum projeto avaliado foi encontrado no seu perímetro.",
        "completion": "Completude dos catálogos",
        "completionSubtitle": "Os catálogos ativos nas entidades do fornecedor",
        "completionEmpty": "Nenhum catálogo ativo neste fornecedor",
        "completionScore": "Completude média",
        "approval": "Status de homologação",
        "approvalDerived": "Recalculado a cada exibição",
        "history": "Tendência",
        "historyUnavailable": "Histórico indisponível",
        "historyWhy": "O módulo de decisão do beCPG não pôde fornecer o histórico.",
        "historyWhyBy": {
            "supplierAxisUnavailable": "O módulo de BI está ativo, mas ainda não distingue os fornecedores: o eixo fornecedor precisa ser adicionado ao cubo e o esquema recarregado.",
            "supplierUnresolved": "Este fornecedor ainda não está no módulo de BI: ele aparecerá na próxima reconstrução.",
            "noData": "O módulo de BI conhece este fornecedor, mas ainda não tem nenhum ponto para o período: o histórico se preenche à medida que é alimentado.",
            "unknownQuery": "A série solicitada não está declarada no portal: um defeito de configuração, não uma ausência de dados.",
            "unreachable": "O módulo de decisão do beCPG não responde: está desativado nesta instância ou seu servidor está inacessível.",
            "denied": "Sua conta não tem acesso ao módulo de decisão do beCPG."
        },
        "historyNeeds": "O que o lado BI precisa para ativá-lo",
        "dimensions": "Dimensões",
        "measures": "Medidas",
        "statusPartial": "parcial",
        "statusMissing": "a criar",
        "trendLast": "Último ponto: {value} em {date}",
        "trendCaption": "Pontuação ponderada ao longo do tempo"
    },
    "components/monitor/SupplierTable#LABELS": {
        "caption": "Fornecedores da base, status de homologação e indicadores calculados",
        "columns": {
            "name": "Fornecedor",
            "code": "Código",
            "status": "Homologação",
            "risk": "Risco",
            "completion": "Completude",
            "documentsExpired": "Doc. expirados",
            "documentsExpiring": "Doc. a expirar",
            "documentsMissing": "Doc. ausentes",
            "openNc": "NCs abertas",
            "openProjects": "Projetos",
            "family": "Família",
            "sites": "Unidades",
            "buyer": "Comprador",
            "lastActivity": "Última atividade"
        },
        "metrics": {
            "documentsExpired": "{count} documento(s) obrigatório(s) expirado(s)",
            "documentsExpiring": "{count} documento(s) próximo(s) da expiração",
            "documentsMissing": "{count} documento(s) obrigatório(s) não fornecido(s)",
            "openNc": "{count} não conformidade(s) aberta(s)",
            "openProjects": "{count} projeto(s) aberto(s)"
        },
        "none": "—",
        "noBuyer": "Não atribuído",
        "empty": "Nenhum fornecedor neste perímetro",
        "emptyHint": "Amplie os filtros ou verifique seu perímetro de comprador.",
        "emptyFiltered": "Nenhum fornecedor corresponde a estes filtros.",
        "compare": "Comparar",
        "compareTitle": "Comparação de {count} fornecedores",
        "compareCapped": "Comparação limitada aos {max} primeiros fornecedores selecionados — além disso, as colunas deixam de ser legíveis.",
        "compareRows": {
            "status": "Status de homologação",
            "reasons": "Motivos",
            "risk": "Pontuação de risco",
            "completion": "Completude (catálogos)",
            "documentsExpired": "Documentos expirados",
            "documentsExpiring": "Documentos a expirar",
            "documentsMissing": "Documentos ausentes",
            "openNc": "NCs abertas",
            "openProjects": "Projetos abertos",
            "state": "Estado beCPG",
            "family": "Família",
            "sites": "Unidades",
            "buyer": "Comprador responsável",
            "lastActivity": "Última atividade"
        },
        "openSheet": "Abrir a ficha",
        "selected": "{count} selecionado(s)",
        "clear": "Limpar a seleção",
        "close": "Fechar",
        "noReason": "Nenhum motivo de risco"
    },
    "components/products/CatalogPanel#LABELS": {
        "title": "Conformidade",
        "overall": "Completude",
        "complete": "Completo",
        "incomplete": "Incompleto",
        "missing": "Campos ausentes",
        "missingCount": "{count} campo(s) ausente(s)",
        "duplicates": "Valores já em uso",
        "duplicateOn": "Já utilizado por",
        "duplicateUnnamed": "{count} outro(s) produto(s)",
        "protectedFields": "{count} campo(s) deste catálogo é(são) preenchido(s) pelo seu cliente",
        "protectedFieldsHint": "Eles contam para a pontuação, mas não são solicitados a você: você não pode preenchê-los, seu cliente o faz.",
        "none": "Nenhum catálogo aplicável",
        "noneHint": "Nenhum catálogo de conformidade está configurado para este produto, portanto não há verificação de completude a atender.",
        "allComplete": "Todos os catálogos estão completos",
        "allCompleteHint": "Nada bloqueia a validação deste produto do ponto de vista dos dados.",
        "missingHint": "Preencha os campos abaixo para chegar a 100 % — são eles que impedem a validação.",
        "goToField": "Ir para o campo",
        "notScored": "Não avaliado"
    },
    "components/products/CompletionMeter#LABELS": {
        "title": "Completude",
        "noScore": "Ainda não avaliada",
        "notCounted": "fora da nota",
        "more": "+ {count} catálogo(s) a mais"
    },
    "components/products/ProductHeader#LABELS": {
        "code": "Código",
        "branch": "Atualização em andamento",
        "branchFrom": "Atualização da versão {version}",
        "branchTitle": "Esta ficha é uma cópia de trabalho criada para o referenciamento.",
        "branchTitleLocked": "Esta ficha é a cópia de trabalho criada para o referenciamento. A versão aprovada existe no lado do cliente, mas você não tem acesso de leitura a ela.",
        "erpCode": "Código ERP",
        "supplier": "Fornecedor",
        "subsidiary": "Filial",
        "project": "Projeto",
        "modified": "Atualizado",
        "created": "Criado em",
        "version": "Versão",
        "legalName": "Razão social",
        "back": "Meus produtos",
        "types": {
            "bcpg:rawMaterial": "Matéria-prima",
            "bcpg:finishedProduct": "Produto acabado",
            "bcpg:semiFinishedProduct": "Semiacabado",
            "bcpg:localSemiFinishedProduct": "Semiacabado local",
            "bcpg:packagingMaterial": "Embalagem",
            "bcpg:packagingKit": "Kit de embalagem",
            "bcpg:supplier": "Fornecedor",
            "bcpg:productSpecification": "Especificação",
            "qa:nc": "Não conformidade"
        }
    },
    "components/products/ProductSections#LABELS": {
        "sheet": "Ficha",
        "compliance": "Conformidade",
        "documents": "Documentos",
        "specs": "Especificações",
        "sections": "Seções da ficha",
        "noProperties": "Nenhuma propriedade a exibir",
        "noPropertiesHint": "As propriedades deste produto não são expostas pela configuração do assistente.",
        "rawProperties": "Propriedades",
        "rawNotice": "Rótulos técnicos: a configuração do assistente não está disponível para este produto.",
        "noData": "Nenhum dado fornecido",
        "noDataHint": "Esta seção não contém nenhuma linha para este produto.",
        "configTitle": "Configuração indisponível",
        "configHint": "Não foi possível carregar a configuração desta seção. As outras abas continuam disponíveis.",
        "documentsHint": "O que seu cliente espera para este produto, e até quando.",
        "readOnly": "Somente consulta: o preenchimento é feito a partir da tarefa atribuída a você.",
        "yes": "Sim",
        "no": "Não"
    },
    "components/products/ProductTaskBanner#LABELS": {
        "one": "Uma tarefa está aberta nesta ficha",
        "many": "Várias tarefas estão abertas nesta ficha",
        "open": "Abrir a tarefa",
        "all": "Ver as tarefas deste produto",
        "untitled": "Tarefa sem título"
    },
    "components/products/UpdateRequestDialog#LABELS": {
        "title": "Solicitar uma atualização",
        "intro": "Seu cliente recebe a solicitação e a trata como um referenciamento: você receberá uma tarefa para atualizar a ficha, que ele validará. Nada muda até lá.",
        "template": "Tipo de solicitação",
        "templatePlaceholder": "Escolher…",
        "noTemplate": "Seu cliente não abriu nenhum tipo de solicitação aos fornecedores. Escreva para ele em Mensagens.",
        "reason": "Motivo da solicitação",
        "reasonHint": "Nova receita, nova origem, novo local de produção, nova ficha técnica…",
        "file": "Nova ficha técnica (opcional)",
        "submit": "Enviar a solicitação",
        "sent": "Solicitação enviada. Uma tarefa de atualização foi aberta para você.",
        "sentFileFailed": "Solicitação enviada, mas a ficha técnica não pôde ser enviada: envie-a pela tarefa."
    },
    "components/shell/Header#LOCAL_LABELS": {
        "menu": "Abrir o menu",
        "account": "Minha conta",
        "home": "beCPG — início do portal"
    },
    "components/shell/Nav#LOCAL_LABELS": {
        "more": "Mais",
        "menu": "Menu",
        "close": "Fechar o menu",
        "supplierSpace": "Espaço do fornecedor",
        "monitorSpace": "Espaço de monitoramento",
        "collapse": "Recolher o menu",
        "expand": "Expandir o menu"
    },
    "components/shell/NotificationBell#LOCAL": {
        "open": "Notificações",
        "panel": "Notificações",
        "close": "Fechar",
        "refresh": "Atualizar",
        "markRead": "Marcar como lida",
        "countOne": "1 notificação pendente",
        "countMany": "{count} notificações pendentes",
        "countNone": "Nenhuma notificação",
        "updatedAt": "Atualizado às {time}",
        "more": "e mais {count} — veja “Meus documentos” e “Minhas tarefas”",
        "allTasks": "Minhas tarefas",
        "allDocuments": "Meus documentos"
    },
    "components/shell/SupplierSwitcher#LABELS": {
        "all": "Todos os fornecedores",
        "change": "Trocar de fornecedor",
        "current": "Fornecedor selecionado",
        "group": "Minhas fichas de fornecedor",
        "scope": "Escopo"
    },
    "components/signature/PdfViewer#LABELS": {
        "previous": "Página anterior",
        "next": "Próxima página",
        "page": "Página",
        "of": "de {pages}",
        "zoomIn": "Ampliar",
        "zoomOut": "Reduzir",
        "fit": "Ajustar à largura",
        "download": "Baixar o PDF",
        "loading": "Carregando o documento…",
        "pageLoading": "Carregando a página {page}…",
        "error": "Não foi possível exibir este documento",
        "errorHint": "O arquivo pode estar protegido ou temporariamente indisponível. Você pode tentar novamente ou baixá-lo para lê-lo.",
        "retry": "Tentar novamente",
        "pinch": "Use o gesto de pinça para ampliar"
    },
    "components/signature/SignatureDocument#LABELS": {
        "zonesHint": "Os quadros indicam onde sua assinatura e sua rubrica serão aplicadas.",
        "counter": "Documento {index} de {total}",
        "read": "Lido",
        "unavailable": "Documento indisponível",
        "unavailableHint": "Este documento não está mais acessível no beCPG: ele pode ter sido substituído após a assinatura, ou seu acesso a ele foi removido. Solicite uma cópia ao seu cliente, se precisar."
    },
    "components/signature/SignatureFlow#LABELS": {
        "title": "Assinatura",
        "back": "Minhas tarefas",
        "loading": "Abrindo o documento…",
        "notFound": "Nenhum documento a assinar",
        "notFoundHint": "Esta tarefa não referencia nenhum documento assinável. O entregável pode ainda estar em preparação — entre em contato com seu cliente pela discussão do projeto.",
        "readTitle": "Leitura do documento",
        "progress": "{seen} / {pages} páginas lidas",
        "progressDone": "Documento lido por completo",
        "progressHint": "O botão de assinatura é liberado depois que todas as páginas forem vistas.",
        "readyHint": "Tudo pronto: sua assinatura será aplicada ao documento.",
        "goToPage": "Retomar na página {page}",
        "goToDocumentPage": "Retomar no doc. {document}, página {page}",
        "documentCount": "{count} documentos a assinar",
        "toSignature": "Ir para a assinatura",
        "signTitle": "Sua assinatura",
        "initialsTitle": "Sua rubrica",
        "initialsHint": "Ela será aplicada no rodapé de cada página.",
        "consent": "Li o documento inteiro e concordo em assiná-lo eletronicamente. Reconheço que esta assinatura tem o mesmo valor de uma assinatura manuscrita.",
        "sign": "Assinar o documento",
        "signing": "Assinando…",
        "blockedRead": "Leia todas as páginas para poder assinar.",
        "blockedSignature": "Adicione sua assinatura.",
        "blockedInitials": "Adicione sua rubrica.",
        "blockedConsent": "Marque a caixa de consentimento.",
        "successTitle": "Documento assinado",
        "successBody": "Sua assinatura foi registrada. O beCPG a aplica ao documento e envia uma cópia por e-mail. Você também a encontrará em Meus documentos › Assinados.",
        "successNext": "Nada mais é esperado de você: a tarefa é encerrada e seu cliente é notificado.",
        "successDownload": "Baixar o documento",
        "successBack": "Voltar às minhas tarefas",
        "signedTitle": "Este documento já está assinado",
        "signedBody": "Uma assinatura já foi registrada para esta tarefa. Nada a refazer — você pode baixar o documento.",
        "signedBodyNoCopy": "Uma assinatura já foi registrada para esta tarefa. Nada a refazer. O documento não está mais acessível pelo portal; solicite uma cópia ao seu cliente, se precisar.",
        "signedView": "Ver o documento",
        "signedComplete": "Concluir a tarefa",
        "signedCompleteDone": "Tarefa concluída.",
        "signedCompleteError": "Não foi possível concluir a tarefa.",
        "cancelledTitle": "Assinatura cancelada",
        "cancelledBody": "Esta solicitação de assinatura foi cancelada pelo seu cliente. Nenhuma ação é esperada de você.",
        "closedTitle": "Tarefa já tratada",
        "closedBody": "Esta tarefa não está mais aberta. Se acredita que se trata de um erro, entre em contato com seu cliente.",
        "externalTitle": "Assinatura no seu provedor",
        "externalBody": "Seu cliente utiliza um serviço de assinatura externo. O documento será aberto em uma nova aba; volte aqui quando terminar.",
        "externalOpen": "Abrir a assinatura",
        "failed": "Não foi possível registrar a assinatura.",
        "failedNetwork": "A conexão caiu durante o envio. Sua assinatura não foi perdida: tente novamente, ela não será registrada duas vezes.",
        "retry": "Tentar novamente",
        "refresh": "Atualizar",
        "leaving": "A assinatura está sendo enviada. Sair agora pode interrompê-la.",
        "document": "Documento"
    },
    "components/signature/SignaturePad#LABELS": {
        "draw": "Desenhar",
        "type": "Digitar meu nome",
        "drawHint": "Assine dentro do quadro com o dedo, uma caneta ou o mouse.",
        "typeHint": "Seu nome será aplicado como assinatura.",
        "namePlaceholder": "Nome SOBRENOME",
        "nameLabel": "Nome do signatário",
        "clear": "Limpar",
        "undo": "Desfazer o último traço",
        "preview": "Pré-visualização da sua assinatura",
        "empty": "Nenhuma assinatura ainda",
        "required": "Sua assinatura é obrigatória para continuar.",
        "initialsType": "Digitar minhas iniciais",
        "initialsDrawHint": "Desenhe sua rubrica dentro do quadro.",
        "initialsTypeHint": "Estas iniciais serão aplicadas como rubrica.",
        "initialsNameLabel": "Iniciais",
        "initialsPlaceholder": "VL",
        "initialsPreview": "Pré-visualização da sua rubrica",
        "initialsEmpty": "Nenhuma rubrica ainda"
    },
    "components/signature/SignatureZones#DEFAULT_LABELS": {
        "signature": "Assinatura",
        "initials": "Rubrica",
        "date": "Data",
        "text": "Texto"
    },
    "components/specs/SpecPanel#LABELS": {
        "title": "Especificações",
        "subtitle": "Documentos de referência aplicáveis aos seus produtos",
        "consult": "Visualizar",
        "open": "Abrir",
        "download": "Baixar",
        "appliesTo": "Aplica-se a",
        "andOthers": "e mais {count}",
        "updated": "Atualizado em {date}",
        "search": "Pesquisar uma especificação",
        "none": "Nenhuma especificação",
        "noneHint": "Nenhuma especificação está vinculada a este escopo. O cliente compartilhará uma, se alguma se aplicar.",
        "noResult": "Nenhuma especificação corresponde a esta pesquisa",
        "count": "{count} documento(s)",
        "readFirst": "Ler antes de preencher",
        "unreadable": "{count} especificação(ões) se aplica(m) aos seus produtos, mas sua conta não pode abri-la(s). Solicite acesso ao seu cliente."
    },
    "components/survey/DecisionTree#LABELS": {
        "required": "Pergunta obrigatória",
        "noAnswer": "Não respondida",
        "choose": "Selecione uma resposta",
        "openLink": "Abrir o link",
        "answer": "Resposta",
        "blank": "Esta pergunta obrigatória ainda está sem resposta."
    },
    "components/tasks/TaskActions#LABELS": {
        "complete": "Concluir a tarefa",
        "refuse": "Recusar",
        "completeTitle": "Concluir esta tarefa?",
        "completeMessage": "A tarefa será marcada como concluída e o projeto passa para a etapa seguinte.",
        "refuseTitle": "Recusar esta tarefa?",
        "refuseMessage": "O projeto volta para a etapa definida pelo caminho de recusa. O motivo abaixo é enviado ao fornecedor.",
        "refuseReason": "Motivo da recusa",
        "refuseReasonHint": "Este texto é enviado ao fornecedor: indique o que deve ser corrigido.",
        "refuseReasonRequired": "Um motivo é obrigatório para recusar.",
        "cancel": "Cancelar",
        "completed": "Tarefa concluída.",
        "refused": "Tarefa recusada."
    },
    "components/ui/DataTable#LOCAL_LABELS": {
        "selectAll": "Selecionar tudo",
        "selectRow": "Selecionar a linha",
        "columns": "Colunas visíveis",
        "rowsPerPage": "Linhas por página"
    },
    "components/ui/EmptyState#SENTENCES": {
        "empty": "Ainda não há nada a exibir aqui. Os itens aparecerão assim que forem criados ou enviados.",
        "search": "Nenhum item corresponde à sua pesquisa. Experimente menos palavras ou remova um dos filtros."
    },
    "components/ui/TabScroller#LOCAL": {
        "previous": "Abas anteriores",
        "next": "Próximas abas"
    },
    "components/wizard/AutoSaveIndicator#LABELS": {
        "pending": "Alterações pendentes",
        "saving": "Salvando…",
        "saved": "salvo às {time}",
        "savedShort": "Salvo",
        "error": "Não foi possível salvar",
        "retry": "Tentar novamente",
        "unsaved": "Suas alterações não foram perdidas: elas serão enviadas novamente."
    },
    "components/wizard/TechnicalSheetBanner#LABELS": {
        "title": "Ficha técnica",
        "deposited": "Enviada em {date}",
        "replace": "Substituir",
        "cancel": "Cancelar",
        "missing": "Ficha técnica ausente",
        "missingHint": "Envie sua ficha técnica para ativar as sugestões da IA.",
        "missingClosed": "Nenhuma ficha técnica foi enviada para esta ficha."
    },
    "components/wizard/Wizard#LABELS": {
        "context": "Contexto",
        "discussion": "Discussão",
        "documents": "Documentos",
        "technicalSheet": "Ficha técnica",
        "suggestions": "Sugestões",
        "compliance": "Conformidade",
        "properties": "Propriedades",
        "list": "Lista",
        "survey": "Questionário",
        "readOnly": "Somente leitura",
        "readOnlyReasons": {
            "readAccess": "Você tem apenas acesso de leitura a esta ficha.",
            "noAssignedTask": "Nenhuma tarefa está atribuída a você nesta ficha: o preenchimento está encerrado.",
            "wizardReadOnly": "Este assistente está configurado como somente leitura."
        },
        "finish": "Concluir",
        "finished": "Tarefa enviada ao seu cliente",
        "finishBlocked": "Preencha os campos ausentes da etapa “Conformidade” para concluir.",
        "finishMissingStep": "“{step}”: {count} resposta(s) obrigatória(s) ausente(s).",
        "finishGapStep": "{step} · {count} campo(s)",
        "finishGapCatalog": "{step} · {count} esperado(s)",
        "finishGapCatalogPlain": "{step} a completar",
        "notFound": "Ficha não encontrada",
        "notFoundHint": "Esta ficha não existe ou não faz parte do seu escopo.",
        "delegated": "Você está preenchendo em nome de {supplier}",
        "due": "Vence em {date}",
        "step": "Etapa",
        "widen": "Ampliar a área de preenchimento",
        "widenHint": "Oculta os painéis laterais e reduz as etapas aos seus ícones.",
        "restore": "Restaurar os painéis",
        "steps": "Etapas"
    },
    "components/wizard/WizardFooter#LABELS": {
        "previous": "Anterior",
        "next": "Próximo",
        "finish": "Concluir",
        "finishing": "Enviando…",
        "formulating": "Recalculando…",
        "blocked": "Ainda não é possível concluir",
        "incomplete": "Ficha incompleta"
    },
    "components/wizard/WizardStepper#LABELS": {
        "title": "Etapas",
        "step": "Etapa {index} de {total}",
        "open": "Escolher uma etapa",
        "frozen": "Validada pelo cliente",
        "readOnly": "Somente leitura",
        "done": "Visitada",
        "complete": "Completa",
        "current": "Etapa atual",
        "todo": "Ainda não visitada",
        "locked": "Disponível mais tarde",
        "incomplete": "{count} obrigatório(s) ausente(s)",
        "catalogGap": "{count} campo(s) esperado(s) pelo catálogo",
        "remaining": "{count} seção(ões) a completar",
        "remainingNone": "Nada sinalizado como ausente",
        "remainingHint": "Seu cliente aguarda estas informações para validar a ficha.",
        "remainingHintNone": "Você pode voltar a qualquer etapa a qualquer momento.",
        "collapse": "Recolher as etapas",
        "expand": "Expandir as etapas"
    },
    "components/wizard/panels/CommentsPanel#LABELS": {
        "title": "Discussão",
        "subtitle": "Suas trocas com seu cliente sobre esta ficha",
        "placeholder": "Escreva uma mensagem…",
        "send": "Enviar",
        "empty": "Nenhuma mensagem",
        "emptyHint": "Faça uma pergunta ao seu cliente ou responda a uma das observações dele.",
        "emptyAnchored": "Nenhuma mensagem sobre este item",
        "subject": "Assunto",
        "whole": "A ficha inteira",
        "onField": "Campo: {label}",
        "onRow": "Linha: {label}",
        "onRowOfList": "Linha “{label}” de “{list}”",
        "inList": "Uma linha de “{list}”",
        "row": "uma linha",
        "anchored": "Sobre {label}",
        "clear": "Remover o vínculo",
        "readOnly": "A discussão está em somente leitura.",
        "posting": "Enviando…",
        "count": "{count} mensagem(ns)",
        "denyReasons": {
            "noAssignedTask": "O referenciamento foi encerrado: esta discussão está em somente leitura.",
            "readAccess": "Você tem apenas acesso de leitura a esta ficha.",
            "noPermission": "Você não tem permissão para escrever nesta discussão."
        }
    },
    "components/wizard/panels/HelpPanel#LABELS": {
        "title": "Contexto",
        "suggestions": "Sugestões da IA",
        "specs": "Especificações",
        "specsEmpty": "Nenhuma especificação vinculada a esta ficha.",
        "specsUnreadable": "Uma especificação está vinculada a esta ficha, mas sua conta não pode abri-la.",
        "refusals": "Recusas anteriores",
        "refusalsEmpty": "Nenhuma recusa nesta ficha.",
        "refusalsHint": "Estas etapas foram devolvidas a você: leia a observação associada antes de enviar novamente.",
        "onField": "em {field}",
        "seeStep": "Abrir",
        "more": "+{count} outras"
    },
    "components/wizard/steps/DataListStep#LABELS": {
        "row": "Linha {index}"
    },
    "components/wizard/steps/DocumentsStep#LABELS": {
        "title": "Documentos esperados",
        "subtitle": "O que seu cliente espera, e até quando.",
        "otherTitle": "Outros documentos",
        "otherSubtitle": "Os arquivos da pasta que não atendem a nenhuma das exigências acima. Solte aqui qualquer documento útil (foto, análise…).",
        "blocking": "{count} documento(s) obrigatório(s) ausente(s)",
        "allGood": "Todos os documentos obrigatórios foram fornecidos",
        "readOnly": "Você não pode depositar um documento nesta ficha."
    },
    "components/wizard/steps/FormStep#LABELS": {
        "comment": "Comentar este campo",
        "comments": "{count} mensagem(ns) sobre este campo",
        "catalogGap": "Esperado pelo catálogo do seu cliente",
        "catalogGapLocale": "Esperado pelo catálogo do seu cliente em {locale}",
        "frozenTitle": "Seção validada pelo seu cliente",
        "frozenText": "Seu cliente validou estas informações: elas estão congeladas e não podem mais ser modificadas. Se for necessária uma correção, solicite a reabertura pela discussão.",
        "readAccessTitle": "Somente leitura",
        "readAccessText": "Você não tem acesso de escrita a esta ficha.",
        "noTaskTitle": "Nenhuma tarefa aberta",
        "noTaskText": "Esta ficha não está atribuída a você no momento: você pode lê-la, mas não modificá-la.",
        "readOnlyTitle": "Somente leitura",
        "readOnlyText": "Esta etapa não pode ser modificada."
    },
    "components/wizard/steps/ReviewStep#LABELS": {
        "title": "Conformidade",
        "subtitle": "O que ainda falta para que seu cliente possa validar a ficha.",
        "blocking": "Catálogo(s) bloqueante(s): {names}",
        "blockingHint": "Preencha os campos ausentes abaixo para poder concluir.",
        "ready": "Todos os catálogos bloqueantes foram atendidos",
        "incomplete": "Catálogo(s) a completar: {names}",
        "documents": "Documentos obrigatórios",
        "documentsMissing": "{count} documento(s) obrigatório(s) ausente(s)",
        "documentsOk": "Todos os documentos obrigatórios foram fornecidos",
        "reviewTitle": "Ficha em somente leitura",
        "reviewSubtitle": "Você está consultando esta ficha: nenhuma modificação é possível.",
        "expand": "Mostrar",
        "collapse": "Ocultar",
        "expandAll": "Expandir tudo",
        "collapseAll": "Recolher tudo",
        "reviewed": "Seção revisada",
        "reviewedHint": "Marque as seções à medida que avança: {done} de {total} revisada(s).",
        "empty": "Nada a exibir"
    },
    "components/wizard/steps/SuggestionsStep#LABELS": {
        "title": "Extração automática",
        "subtitle": "Estes valores foram lidos nos documentos que você depositou. Verifique-os: o controle continua com você.",
        "applied": "Aplicados automaticamente",
        "appliedHint": "Confiança alta: o valor já está aplicado, você pode desfazê-lo.",
        "toConfirm": "A confirmar",
        "toConfirmHint": "Verifique o valor proposto e depois aplique-o.",
        "flagged": "Digite você mesmo",
        "flaggedHint": "A extração não é confiável o suficiente: preferimos que você mesmo o digite.",
        "unscored": "Propostas",
        "unscoredHint": "Estas propostas não têm índice de confiança.",
        "apply": "Aplicar",
        "expand": "Expandir",
        "applyAnyway": "Aplicar mesmo assim",
        "revoke": "Desfazer",
        "restore": "Revisar",
        "applying": "Aplicando…",
        "appliedAt": "Aplicado",
        "revoked": "Desfeito",
        "dismissed": "Descartado",
        "notRevocable": "O valor anterior não pode ser restaurado automaticamente: edite o campo diretamente, se necessário.",
        "empty": "Nenhuma sugestão",
        "emptyHint": "Nada a propor para esta etapa. A ficha técnica foi enviada logo acima: a extração proporá os valores que encontrar nela.",
        "emptyEntityLevel": "A análise foi executada, mas produziu apenas deduções feitas a partir da própria ficha, sem nenhum documento que as sustente: elas não são oferecidas a você.",
        "analysing": "Análise em andamento",
        "analysingHint": "O portal está lendo seus documentos. As propostas aparecerão aqui automaticamente, sem sair da página: a leitura de uma ficha técnica geralmente leva menos de um minuto.",
        "analysingPlugins": "Em execução: {plugins}",
        "refresh": "Executar a análise novamente",
        "readOnly": "Esta ficha está em somente leitura: as sugestões não podem ser aplicadas.",
        "source": "Fonte",
        "changes": "{count} valor(es)",
        "error": "Falha ao aplicar a sugestão."
    },
    "components/wizard/steps/SurveyStep#LABELS": {
        "discuss": "Discussão",
        "answered": "{answered} de {total} respondida(s)",
        "empty": "Nenhuma pergunta",
        "emptyHint": "Seu cliente ainda não publicou um questionário para esta ficha.",
        "check": "Verificar minhas respostas",
        "complete": "Questionário completo",
        "missingTitle": "{count} pergunta(s) obrigatória(s) ainda sem resposta",
        "missingHint": "Escolha uma para ir diretamente a ela. Suas outras respostas já estão salvas.",
        "readOnly": "Somente consulta",
        "noneAnswered": "Nenhuma resposta registrada",
        "noneAnsweredHint": "O questionário se desenvolve à medida que você responde.",
        "dropped": "Seu cliente não previu onde armazenar {count} de suas respostas: {questions}. Elas não foram salvas — informe seu cliente."
    },
    "lib/adapters/monitor#CSV_HEADERS": {
        "code": "Código",
        "name": "Fornecedor",
        "legalName": "Razão social",
        "approvalStatus": "Status de homologação",
        "approvalReasons": "Motivos",
        "completion": "Completude (%)",
        "risk": "Risco",
        "riskLevel": "Nível de risco",
        "documentsExpired": "Documentos expirados",
        "documentsExpiring": "Documentos a expirar",
        "documentsMissing": "Documentos ausentes",
        "openNc": "NCs abertas",
        "openProjects": "Projetos abertos",
        "family": "Família",
        "buyer": "Comprador",
        "lastActivity": "Última atividade",
        "state": "Estado",
        "compliance": "Conformidade (%)"
    },
    "config/messages#messages": {
        "app.title": "Portal do Fornecedor",
        "app.shortTitle": "Portal",
        "app.tenantSuffix": "espaço do fornecedor",
        "app.description": "Portal do fornecedor beCPG — referenciamento, documentos e conformidade",
        "nav.dashboard": "Painel",
        "nav.tasks": "Minhas tarefas",
        "nav.products": "Meus produtos",
        "nav.documents": "Meus documentos",
        "nav.company": "Minha empresa",
        "nav.specs": "Especificações",
        "nav.messages": "Discussões",
        "nav.notifications": "Notificações",
        "nav.help": "Ajuda",
        "nav.monitor": "Monitoramento",
        "nav.monitor.suppliers": "Fornecedores",
        "nav.monitor.products": "Produtos de fornecedores",
        "nav.monitor.documents": "Conformidade documental",
        "nav.monitor.campaigns": "Projetos",
        "nav.monitor.quality": "Não conformidades",
        "nav.monitor.reports": "Relatórios",
        "nav.monitor.tasks": "Minhas tarefas",
        "account.profile": "Meu perfil",
        "account.language": "Idioma",
        "account.login": "Entrar",
        "account.logout": "Sair",
        "account.tenant": "Cliente",
        "account.suppliers": "Minhas fichas de fornecedor",
        "account.allSuppliers": "Todos os fornecedores",
        "action.save": "Salvar",
        "action.cancel": "Cancelar",
        "action.close": "Fechar",
        "action.back": "Voltar",
        "action.next": "Próximo",
        "action.previous": "Anterior",
        "action.submit": "Enviar",
        "action.confirm": "Confirmar",
        "action.delete": "Excluir",
        "action.download": "Baixar",
        "action.upload": "Enviar um arquivo",
        "action.retry": "Tentar novamente",
        "action.search": "Pesquisar",
        "action.filter": "Filtrar",
        "action.reset": "Redefinir",
        "action.export": "Exportar",
        "action.sign": "Assinar",
        "action.showMore": "Mais {count}",
        "action.showLess": "Mostrar menos",
        "suggestion.replaces": "Substitui {value}",
        "state.loading": "Carregando…",
        "state.saving": "Salvando…",
        "state.saved": "Salvo",
        "state.empty": "Nada a exibir",
        "state.noResults": "Nenhum resultado para esta pesquisa",
        "state.required": "Campo obrigatório",
        "state.of": "{from}-{to} de {total}",
        "state.page": "Página {page} de {pages}",
        "state.atLeast": "pelo menos {total}",
        "error.title": "Algo deu errado",
        "error.generic": "Algo deu errado. Tente novamente.",
        "error.network": "Não foi possível acessar o servidor.",
        "error.upstream": "O beCPG retornou um erro. Tente novamente; se o problema persistir, informe seu administrador.",
        "error.unauthorized": "Sua sessão expirou. Entre novamente.",
        "error.forbidden": "Você não tem permissão para realizar esta ação.",
        "error.notFound": "Esta página ou este item não existe.",
        "error.tenant": "Nenhum cliente está associado à sua conta.",
        "error.upload": "O envio do arquivo falhou.",
        "error.http": "Erro {status}: {message}",
        "status.approved": "Homologado",
        "status.inProgress": "Em andamento",
        "status.toRenew": "A renovar",
        "status.suspended": "Suspenso",
        "status.valid": "Válido",
        "status.expiring": "Expira em breve",
        "status.expired": "Expirado",
        "status.missing": "Ausente",
        "status.validityMissing": "Validade a preencher",
        "status.rejected": "Recusado",
        "status.pending": "Pendente",
        "status.completed": "Concluído",
        "status.late": "Atrasado",
        "status.draft": "Rascunho",
        "status.notApplicable": "Não aplicável",
        "test.banner": "Instância de TESTE — os dados digitados aqui não têm valor contratual",
        "test.badge": "Teste",
        "app.monitorSuffix": "gestão de fornecedores"
    },
    "components/monitor/HistoryPanel#LABELS": {
        "title": "Evolução",
        "help": "Lido no módulo de decisão do beCPG, carregado em lote: os números podem ser do último carregamento.",
        "period": "Período",
        "measures": {
            "stepsNumber": "Tarefas",
            "averageActualDurations": "Duração real média (d)",
            "refusalRate": "Taxa de recusa",
            "avgResponseDelay": "Prazo médio de resposta (d)",
            "averageProgress": "Andamento médio",
            "projectsNumber": "Projetos"
        }
    }
};

export default LOCALE;
