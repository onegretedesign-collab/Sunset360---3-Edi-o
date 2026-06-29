import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Ticket, 
  LayoutDashboard, 
  Smartphone, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  Users,
  DollarSign,
  ShoppingBag,
  User,
  Users2,
  Gift,
  MessageCircle,
  Copy,
  Search,
  ClipboardList,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Map as MapIcon,
  Navigation,
  Clock,
  Download,
  Share,
  ArrowUpDown,
  Filter,
  Maximize,
  QrCode,
  Bell,
  Volume2,
  VolumeX,
  Sparkles,
  PlusCircle,
  Check,
  X,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { auth } from './firebase';

const App = () => {
  // Estados principais
  const [view, setView] = useState('home'); // home, buy, payment, success, my_tickets, admin, admin_history, ticket_view
  const [ticketType, setTicketType] = useState('individual'); // individual ou casadinho
  const [ticketsCount, setTicketsCount] = useState(1);
  const [userData, setUserData] = useState({ name: '', whatsapp: '', cpf: '' });
  const [errors, setErrors] = useState({ name: '', whatsapp: '', cpf: '' });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ login: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [viewedTicket, setViewedTicket] = useState<any>(null);
  const [currentSaleHash, setCurrentSaleHash] = useState('');

  // Estados para Registro de Venda Manual pelo Admin
  const [showManualSaleForm, setShowManualSaleForm] = useState(false);
  const [manualSaleData, setManualSaleData] = useState({
    name: '',
    whatsapp: '',
    cpf: '',
    type: 'individual',
    qty: 1,
    method: 'PIX',
    status: 'Ativa'
  });
  const [manualSaleErrors, setManualSaleErrors] = useState({
    name: '',
    whatsapp: '',
    cpf: ''
  });

  const [customToast, setCustomToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'success' });

  const [customConfirm, setCustomConfirm] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmLabel?: string;
    type?: 'danger' | 'info';
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCustomToast({ show: true, message, type });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info', confirmLabel = 'Confirmar') => {
    setCustomConfirm({
      show: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(prev => ({ ...prev, show: false }));
      },
      confirmLabel,
      type
    });
  };

  useEffect(() => {
    if (customToast.show) {
      const timer = setTimeout(() => {
        setCustomToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [customToast.show]);

  // Notificações em tempo real para o admin
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [enableNotificationSound, setEnableNotificationSound] = useState(true);

  const viewRef = useRef(view);
  const isAdminAuthenticatedRef = useRef(isAdminAuthenticated);
  const enableSoundRef = useRef(enableNotificationSound);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    isAdminAuthenticatedRef.current = isAdminAuthenticated;
  }, [isAdminAuthenticated]);

  useEffect(() => {
    enableSoundRef.current = enableNotificationSound;
  }, [enableNotificationSound]);

  // Função para limpar uma notificação visual
  const dismissNotification = (id: string) => {
    setAdminNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Temporizador automático para limpar notificações em 7 segundos
  useEffect(() => {
    if (adminNotifications.length > 0) {
      const latest = adminNotifications[adminNotifications.length - 1];
      const timer = setTimeout(() => {
        setAdminNotifications(prev => prev.filter(n => n.notifId !== latest.notifId));
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [adminNotifications]);

  // Toca um efeito sonoro senoidal agradável em tempo real
  const playNotificationSound = () => {
    if (!enableSoundRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Tom 1: Nota confortável e curta (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); 
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Tom 2: Harmônico superior agradável (A5)
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(880.00, ctx.currentTime); 
          gain2.gain.setValueAtTime(0.18, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.error("Erro secundário no áudio:", e);
        }
      }, 95);
    } catch (err) {
      console.error("Erro ao reproduzir som de notificação:", err);
    }
  };

  // Configurações do Organizador
  const ORGANIZER_WA = "5564984530700"; 
  const EVENT_LOCATION = "Coliseu";
  const PIX_KEY = "Sunset360.quiri@gmail.com"; 
  const OFFICIAL_URL = "http://vendassunset360quiri.com.br/";
  const MAP_URL = "https://share.google/IbVRNpPSDgP0sZvrQ";
  const PROMO_LIMIT = 200;
  const EVENT_DATE = new Date('2026-09-19T18:00:00'); // Data definitiva do evento: 19 de Setembro de 2026 às 18:00h

  // Componente de Contador Regressivo
  const Countdown = () => {
    const [timeLeft, setTimeLeft] = useState({
      days: 0, hours: 0, minutes: 0, seconds: 0, isOver: false
    });

    useEffect(() => {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance = EVENT_DATE.getTime() - now;

        if (distance < 0) {
          setTimeLeft(prev => ({ ...prev, isOver: true }));
          clearInterval(timer);
          return;
        }

        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
          isOver: false
        });
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    if (timeLeft.isOver) return (
      <div className="bg-orange-600/20 border border-orange-500/50 p-3 rounded-xl text-center">
        <span className="text-sm font-black uppercase italic text-orange-500">O EVENTO COMEÇOU! 🌅✨</span>
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="px-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 italic">Contagem Regressiva</span>
          </div>
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-[1px] rounded-2xl shadow-lg shadow-orange-600/20">
            <div className="bg-black rounded-[15px] p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest italic leading-none mb-1">Data do Evento</span>
                <h3 className="text-[26px] font-black text-white italic uppercase tracking-tighter leading-none whitespace-nowrap">19 SETEMBRO</h3>
              </div>
              <div className="h-10 w-[1px] bg-neutral-800 mx-4"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest italic leading-none mb-1">Início</span>
                <span className="text-[26px] font-black text-white italic uppercase tracking-tighter leading-none whitespace-nowrap">18:00H</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 justify-between">
          {[
            { label: 'Dias', value: timeLeft.days },
            { label: 'Horas', value: timeLeft.hours },
            { label: 'Min', value: timeLeft.minutes },
            { label: 'Seg', value: timeLeft.seconds },
          ].map((item, idx) => (
            <div key={idx} className="flex-1 bg-gradient-to-b from-neutral-900 to-black border border-neutral-800/50 rounded-2xl p-3 text-center shadow-xl relative group">
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
              <div className="text-2xl font-black text-white leading-none italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                {item.value.toString().padStart(2, '0')}
              </div>
              <div className="text-[7px] text-orange-500/70 uppercase font-black tracking-widest mt-1.5 italic">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simula uma nova venda para teste sonoro e visual no painel administrativo
  const triggerTestNotification = () => {
    const testNames = ['Eduardo Negrete', 'Mariana Alencar', 'Arthur Antunes', 'Nathália Nolêto', 'Rogério Negrete'];
    const randomName = testNames[Math.floor(Math.random() * testNames.length)];
    const randomType = Math.random() > 0.5 ? 'individual' : 'casadinho';
    const randomQty = Math.floor(Math.random() * 2) + 1;
    
    const mockSale = {
      id: Date.now(),
      name: randomName + " (Simulação)",
      type: randomType,
      qty: randomQty,
      paymentMethod: 'pix',
      date: new Date().toISOString()
    };
    
    const notifId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
    setAdminNotifications(prev => {
      if (prev.some(item => item.id === mockSale.id)) return prev;
      return [...prev, { notifId, ...mockSale }];
    });
    
    playNotificationSound();
  };

  // URL da Imagem do Banner (Logo Oficial)
  const LOGO_URL = "https://i.postimg.cc/zff0nPVL/LOGO-EVENTO-SUNSET-360-3-EDICAO-01.png"; 

  // Preços
  const PRICES = {
    individual: 30,
    casadinho: 50
  };

  const TICKET_LABELS = {
    individual: 'Individual',
    casadinho: 'Casadinho'
  };

  // Relatório de Vendas (Sincronizado via WebSocket)
  const [salesReport, setSalesReport] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const [promoEnded, setPromoEnded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
        triggerToast("Para instalar, toque no menu do seu navegador e escolha 'Adicionar à tela de início'.", "info");
    }
  };

  // Convites comprados nesta sessão
  const [myTickets, setMyTickets] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('sunset_360_my_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sunset_360_my_tickets', JSON.stringify(myTickets));
    } catch (e) {
      console.error(e);
    }
  }, [myTickets]);

  const fetchSalesReport = () => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSalesReport(data);
        }
      })
      .catch(err => console.error("Erro ao carregar vendas via API:", err));
  };

  // Recarregar relatório de vendas ao alternar para visualizações de administração
  useEffect(() => {
    if (view === 'admin' || view === 'admin_history') {
      fetchSalesReport();
    }
  }, [view]);

  // Inicializar Socket.io e carregar vendas iniciais
  useEffect(() => {
    // Carregar vendas iniciais via REST API (Garante carregamento imediato)
    fetchSalesReport();

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('initial_sales', (sales) => {
      setSalesReport(sales);
    });

    newSocket.on('promo_status', (status) => {
      setPromoEnded(status);
    });

    newSocket.on('sale_added', (newSale) => {
      // Se o painel admin estiver ativo e logado, ativa sons e toasts visuais em tempo real
      if (isAdminAuthenticatedRef.current && viewRef.current === 'admin') {
        const notifId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
        setAdminNotifications(prevNotifs => {
          if (prevNotifs.some(item => item.id === newSale.id)) return prevNotifs;
          return [...prevNotifs, { notifId, ...newSale }];
        });
        
        // Toca o sino de vendas
        playNotificationSound();
      }

      setSalesReport(prev => {
        // Evitar duplicatas
        if (prev.find(s => s.id === newSale.id)) return prev;
        return [newSale, ...prev];
      });
    });

    newSocket.on('sale_deleted', (saleId) => {
      setSalesReport(prev => prev.filter(s => s.id !== saleId));
    });

    newSocket.on('sale_updated', (updatedData) => {
      setSalesReport(prev => prev.map(s => s.id === updatedData.id ? { ...s, ...updatedData } : s));
    });

    newSocket.on('sale_confirmed', (confirmedSale) => {
      setCurrentSaleHash(confirmedSale.hash);
    });

    // Handle URL Ticket View
    const urlParams = new URLSearchParams(window.location.search);
    const ticketHash = urlParams.get('ticket');
    if (ticketHash) {
      newSocket.emit('validate_ticket', ticketHash);
      newSocket.once('ticket_validated', (ticket) => {
        setViewedTicket(ticket);
        setView('ticket_view');
      });
    }

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('update_promo', promoEnded);
    }
  }, [promoEnded]);

  const currentPrice = PRICES[ticketType as keyof typeof PRICES];

  // Função para excluir venda (Exclusivo para o Administrador Autenticado)
  const deleteSale = (id: number) => {
    if (!isAdminAuthenticated) {
      triggerToast("Acesso negado. Apenas o administrador autenticado pode realizar a exclusão de compras.", "error");
      return;
    }

    if (!adminCredentials.login || !adminCredentials.password) {
      triggerToast("Erro de autenticação: credenciais do Administrador não fornecidas.", "error");
      return;
    }

    triggerConfirm(
      "Confirmar Exclusão",
      "Tem certeza de que deseja excluir permanentemente esta compra do banco de dados?",
      () => {
        // Executa a exclusão de forma segura com validação de senha no backend
        fetch(`/api/sales/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            login: adminCredentials.login,
            password: adminCredentials.password
          }),
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              // Atualiza o estado local para remoção imediata
              setSalesReport(prev => prev.filter(s => s.id !== id));
              triggerToast("Compra excluída com sucesso!", "success");
            } else {
              triggerToast(result.error || "Ocorreu um erro ao tentar excluir o registro.", "error");
            }
          })
          .catch(err => {
            console.error("Erro ao excluir venda:", err);
            triggerToast("Erro de rede ao tentar excluir o registro do banco de dados.", "error");
          });
      },
      "danger",
      "Excluir"
    );
  };

  // Função para copiar PIX (compatível com o ambiente)
  const copyToClipboard = () => {
    const textArea = document.createElement("textarea");
    textArea.value = PIX_KEY;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar', err);
    }
    document.body.removeChild(textArea);
  };

  // Notificação via WhatsApp
  const sendWhatsAppNotification = (sale: any) => {
    const total = sale.total || (sale.qty * PRICES[sale.type as keyof typeof PRICES]);
    const cups = sale.cups || ((sale.type === 'individual' ? 1 : 2) * sale.qty);
    const wristbands = sale.wristbands || ((sale.type === 'individual' ? 1 : 2) * sale.qty);
    
    const formattedDate = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    }).replace(',', ' às');

    const paymentMethodText = sale.method === 'PIX' ? 'PIX (Copia e Cola)' : 'Pagamento na Entrega';

    const messageText = `Olá! Acabei de garantir o meu convite para o *Sunset 360º 3ª Edição* no *${EVENT_LOCATION}*! 🌅✨

📅 *Data:* 19 de Setembro às 18 horas

*DADOS DA COMPRA:*
👤 *Comprador:* ${sale.name}
📅 *Data/Hora da compra:* ${formattedDate}
🎟️ *Convite:* ${TICKET_LABELS[sale.type as keyof typeof TICKET_LABELS]}
🔢 *Quantidade:* ${sale.qty}
🥤 *Copos:* ${cups}
🎗️ *Pulseiras:* ${wristbands}
💰 *Valor Total:* R$ ${total},00
💳 *Método:* ${paymentMethodText}

*PONTOS DE VENDAS E RETIRADAS DE PULSEIRAS:*
📍 Delivery Bebidas Geladas
📍 Nathália Nolêto
📍 Rogério Negrete

⚠️ *Atenção:* A retirada de pulseiras nos pontos de vendas deve ser realizada até dia 10 de Setembro.

🎫 *RETIRE SUA PULSEIRA(ª), APRESENTANDO A MENSAGEM DE COMPRA COM SEU NOME E SEUS DADOS.*

🌐 *Garanta o seu também em:*
${OFFICIAL_URL}

📸 *Siga nosso Instagram e compartilhe:*
https://www.instagram.com/sunset360_3edicao?utm_source=qr`;

    const message = encodeURIComponent(messageText);
    
    // Abrir aba para o Organizador
    const waUrlOrganizer = `https://api.whatsapp.com/send?phone=${ORGANIZER_WA}&text=${message}`;
    window.open(waUrlOrganizer, '_blank');
    
    // Abrir aba para o Comprador
    const buyerPhone = sale.whatsapp.replace(/\D/g, '');
    if (buyerPhone && buyerPhone !== ORGANIZER_WA) {
      setTimeout(() => {
        const waUrlBuyer = `https://api.whatsapp.com/send?phone=${buyerPhone}&text=${message}`;
        window.open(waUrlBuyer, '_blank');
      }, 1200);
    }
  };

  const handleWhatsAppNotify = () => {
    if (!currentSaleHash) {
      triggerToast("Aguardando confirmação do servidor... tente novamente em um instante.", "info");
      return;
    }
    const saleData = {
      name: userData.name,
      whatsapp: userData.whatsapp,
      cpf: userData.cpf,
      type: ticketType,
      qty: ticketsCount,
      total: ticketsCount * currentPrice,
      method: paymentMethod === 'pix' ? 'PIX' : 'Retirada'
    };
    sendWhatsAppNotification(saleData);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Sunset 360º - Reserva Confirmada',
        text: `Acabei de garantir meu lugar no Sunset 360º! Reserva confirmada para ${userData.name}.`,
        url: OFFICIAL_URL,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const generateTicketPDF = (ticket: any) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 187],
      });

      // Soft off-white background
      doc.setFillColor(248, 249, 250);
      doc.rect(0, 0, 105, 187, 'F');

      // Add logo image at the top
      const logoImg = document.getElementById('pdf-logo-img') as HTMLImageElement | null;
      let headerBottom = 15; // default starting Y coordinate if logo is not loaded
      if (logoImg && logoImg.complete && logoImg.naturalWidth !== 0) {
        const targetWidth = 55; // mm
        const targetHeight = (targetWidth * logoImg.naturalHeight) / logoImg.naturalWidth;
        const xPos = (105 - targetWidth) / 2; // center it horizontally
        const yPos = 12; // top margin
        doc.addImage(logoImg, 'PNG', xPos, yPos, targetWidth, targetHeight);
        headerBottom = yPos + targetHeight;
      } else {
        // Fallback text if logo hasn't preloaded
        doc.setFillColor(249, 115, 22);
        doc.rect(0, 0, 105, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('SUNSET 360º - 3ª EDIÇÃO', 52.5, 9.5, { align: 'center' });
        headerBottom = 15;
      }

      // Ticket category label
      doc.setTextColor(26, 26, 26);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      const label = TICKET_LABELS[ticket.type as keyof typeof TICKET_LABELS] || ticket.type;
      const categoryY = headerBottom + 12;
      doc.text(label.toUpperCase(), 52.5, categoryY, { align: 'center' });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      const idY = categoryY + 5;
      doc.text(`ID DO CONVITE: #${ticket.id.toString().slice(-8).toUpperCase()}`, 52.5, idY, { align: 'center' });

      // Divider line
      doc.setDrawColor(229, 229, 229);
      doc.setLineWidth(0.5);
      const divider1Y = idY + 5;
      doc.line(10, divider1Y, 95, divider1Y);

      // Ticket Details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      
      const detailsRow1Y = divider1Y + 10;
      const detailsValue1Y = detailsRow1Y + 5;
      
      doc.setTextColor(115, 115, 115);
      doc.text('TITULAR:', 15, detailsRow1Y);
      doc.setTextColor(26, 26, 26);
      doc.text(ticket.name.toUpperCase(), 15, detailsValue1Y);

      doc.setTextColor(115, 115, 115);
      doc.text('QUANTIDADE:', 65, detailsRow1Y);
      doc.setTextColor(26, 26, 26);
      doc.text(`${ticket.qty} Pacote(s)`, 65, detailsValue1Y);

      const detailsRow2Y = detailsValue1Y + 10;
      const detailsValue2Y = detailsRow2Y + 5;

      doc.setTextColor(115, 115, 115);
      doc.text('DOCUMENTO (CPF):', 15, detailsRow2Y);
      doc.setTextColor(26, 26, 26);
      const formattedCpf = ticket.cpf ? formatCPF(ticket.cpf) : 'NÃO INFORMADO';
      doc.text(formattedCpf, 15, detailsValue2Y);

      const isCpfValid = ticket.cpf ? validateCPF(ticket.cpf) : false;
      if (isCpfValid) {
        const cpfWidth = doc.getTextWidth(formattedCpf);
        const badgeX = 15 + cpfWidth + 2;
        doc.setTextColor(34, 197, 94); // emerald-500
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('✓ VALIDADO', badgeX, detailsValue2Y);
        // Restore default styles for subsequent details
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
      }

      doc.setTextColor(115, 115, 115);
      doc.text('PULSEIRAS:', 65, detailsRow2Y);
      doc.setTextColor(249, 115, 22);
      const pulseirasText = `${ticket.qty * (ticket.type === 'individual' ? 1 : 2)} Unidade(s)`;
      doc.text(pulseirasText, 65, detailsValue2Y);

      // Cups calculation & detail
      const cupsQty = ticket.qty * (ticket.type === 'individual' ? 1 : 2);
      const ticketTypeLabel = ticket.type === 'individual' ? 'Individual' : 'Casadinho';
      const cupsText = `${cupsQty} Copo(s) (${ticket.qty}x ${ticketTypeLabel})`;

      const detailsRow3Y = detailsValue2Y + 10;
      const detailsValue3Y = detailsRow3Y + 5;

      doc.setTextColor(115, 115, 115);
      doc.text('COPOS GARANTIDOS:', 15, detailsRow3Y);
      doc.setTextColor(26, 26, 26);
      doc.text(cupsText, 15, detailsValue3Y);

      // Security Anti-counterfeit Purchase Timestamp (Highly Visible Security Info)
      const detailsRow4Y = detailsValue3Y + 10;
      const detailsValue4Y = detailsRow4Y + 5;

      doc.setTextColor(115, 115, 115);
      doc.text('AUTENTICAÇÃO DE COMPRA (DATA/HORA):', 15, detailsRow4Y);
      doc.setTextColor(249, 115, 22);
      const purchaseTimeStr = formatPurchaseDateTime(ticket);
      doc.text(purchaseTimeStr, 15, detailsValue4Y);

      // Divider line 2
      doc.setDrawColor(229, 229, 229);
      const divider2Y = detailsValue4Y + 8;
      doc.line(10, divider2Y, 95, divider2Y);

      // Footer instruction text (as requested by user)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(26, 26, 26);
      const instruct1Y = divider2Y + 8;
      const instruct2Y = instruct1Y + 5;
      doc.text('APRESENTE ESSE COMPROVANTE NA HORA DE RETIRAR', 52.5, instruct1Y, { align: 'center' });
      doc.text('SUA PULSEIRA NO PONTO DE VENDA.', 52.5, instruct2Y, { align: 'center' });

      // Decorative dash line
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      const dashY = instruct2Y + 12;
      doc.line(0, dashY, 105, dashY);

      // Website footer
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(249, 115, 22);
      doc.text('www.sunset360.com.br', 52.5, dashY + 10, { align: 'center' });

      // Download file
      doc.save(`ingresso-sunset360-${ticket.id.toString().slice(-6)}.pdf`);
      triggerToast("PDF gerado com sucesso!", "success");
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      triggerToast("Erro ao gerar o PDF do ingresso.", "error");
    }
  };

  // Lógica de Navegação
  const startPurchase = (type: string) => {
    setTicketType(type);
    setTicketsCount(1);
    setUserData({ name: '', whatsapp: '', cpf: '' });
    setErrors({ name: '', whatsapp: '', cpf: '' });
    setView('buy');
  };

  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const formatPurchaseDateTime = (ticket: any) => {
    try {
      if (!ticket) return "NÃO INFORMADO";
      
      // 1. Check if ticket.id is a 13-digit timestamp (e.g. Date.now())
      const numericId = Number(ticket.id);
      if (!isNaN(numericId) && numericId > 1000000000000 && numericId < 9999999999999) {
        const dateFromId = new Date(numericId);
        return dateFromId.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
      
      const dateStr = ticket.date;
      if (!dateStr) return "NÃO INFORMADO";
      
      if (dateStr.includes('/') && dateStr.includes(':')) {
        return dateStr;
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      
      if (dateStr.length === 10) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]} (AUTENTICADO)`;
        }
      }
      
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return ticket?.date || "NÃO INFORMADO";
    }
  };

  const getDeadlineStatus = () => {
    const now = new Date();
    const deadline = new Date(2026, 8, 10); // 10 de Setembro de 2026
    
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineZero = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    
    const diffTime = deadlineZero.getTime() - todayZero.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        status: 'expired', 
        label: 'Prazo de Retirada Encerrado (10/09)', 
        colorClass: 'text-red-500 bg-red-500/15 border border-red-500/30 px-2 py-1 rounded-lg text-[9px] uppercase font-black italic tracking-tighter flex items-center gap-1 w-fit', 
        iconClass: 'text-red-500 animate-pulse shrink-0' 
      };
    } else if (diffDays <= 2) {
      return { 
        status: 'urgent', 
        label: `Retirada Urgente (${diffDays === 0 ? 'Hoje!' : diffDays === 1 ? 'Amanhã!' : 'Em 2 dias!'})`, 
        colorClass: 'text-rose-500 bg-rose-500/15 border border-rose-500/30 px-2 py-1 rounded-lg text-[9px] uppercase font-black italic tracking-tighter flex items-center gap-1.5 w-fit animate-pulse', 
        iconClass: 'text-rose-500 animate-bounce shrink-0' 
      };
    } else {
      return { 
        status: 'normal', 
        label: 'Retirada até 10 de Setembro', 
        colorClass: 'text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-[9px] uppercase font-black italic tracking-tighter flex items-center gap-1 w-fit', 
        iconClass: 'text-amber-500 shrink-0' 
      };
    }
  };

  const handlePurchase = () => {
    const newErrors = { name: '', whatsapp: '', cpf: '' };
    let isValid = true;

    // Validação do Nome
    if (userData.name.trim().length < 3) {
      newErrors.name = 'O nome deve ter pelo menos 3 caracteres.';
      isValid = false;
    }

    // Validação do WhatsApp (apenas números, deve ter 10 ou 11 dígitos)
    const whatsappDigits = userData.whatsapp.replace(/\D/g, '');
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      newErrors.whatsapp = 'Informe um WhatsApp válido com DDD (ex: 64999999999).';
      isValid = false;
    }

    // Validação do CPF
    if (!userData.cpf) {
      newErrors.cpf = 'O CPF é obrigatório.';
      isValid = false;
    } else if (!validateCPF(userData.cpf)) {
      newErrors.cpf = 'Informe um CPF válido e bem formatado.';
      isValid = false;
    }

    setErrors(newErrors);

    if (isValid) {
      setView('payment');
    }
  };

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    setUserData({ ...userData, whatsapp: formatted });
    if (errors.whatsapp) setErrors({ ...errors, whatsapp: '' });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, name: e.target.value });
    if (errors.name) setErrors({ ...errors, name: '' });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setUserData({ ...userData, cpf: formatted });
    if (errors.cpf) setErrors({ ...errors, cpf: '' });
  };

  const confirmPayment = (method: string) => {
    setPaymentMethod(method);
    const generatedHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setCurrentSaleHash(generatedHash);
    
    const saleData = {
      hash: generatedHash,
      name: userData.name,
      whatsapp: userData.whatsapp.replace(/\D/g, ''),
      cpf: userData.cpf.replace(/\D/g, ''),
      type: ticketType,
      qty: ticketsCount,
      cups: (ticketType === 'individual' ? 1 : 2) * ticketsCount,
      wristbands: (ticketType === 'individual' ? 1 : 2) * ticketsCount,
      total: ticketsCount * currentPrice,
      method: method === 'pix' ? 'PIX' : 'Retirada',
      date: new Date().toISOString(),
      status: 'Ativa'
    };
    
    // Adicionar localmente para feedback imediato (será atualizado e sincronizado com ID real)
    const tempTicket = { ...saleData, id: Date.now() };
    setMyTickets([...myTickets, tempTicket]); 
    
    // Envia a compra para ser registrada de forma segura no banco de dados via REST API
    fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saleData),
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && result.sale) {
          // Atualiza o ticket local com o ID real gerado pelo SQLite
          setMyTickets(prev => prev.map(t => t.hash === generatedHash ? result.sale : t));
        }
      })
      .catch(err => {
        console.error("Erro ao registrar compra via API, tentando via socket:", err);
        if (socket) {
          socket.emit('new_sale', saleData);
        }
      });
      
    setView('success');
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentials.login === 'Sunset' && adminCredentials.password === '124578') {
      setIsAdminAuthenticated(true);
      setLoginError('');
      fetchSalesReport();
    } else {
      setLoginError('Credenciais inválidas. Tente novamente.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminCredentials({ login: '', password: '' });
    setView('home');
  };

  const handleRegisterManualSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = { name: '', whatsapp: '', cpf: '' };
    let isValid = true;

    if (manualSaleData.name.trim().length < 3) {
      newErrors.name = 'O nome deve ter pelo menos 3 caracteres.';
      isValid = false;
    }

    const whatsappDigits = manualSaleData.whatsapp.replace(/\D/g, '');
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      newErrors.whatsapp = 'Informe um WhatsApp válido com DDD (ex: 64999999999).';
      isValid = false;
    }

    if (!manualSaleData.cpf) {
      newErrors.cpf = 'O CPF é obrigatório.';
      isValid = false;
    } else if (!validateCPF(manualSaleData.cpf)) {
      newErrors.cpf = 'Informe um CPF válido e bem formatado.';
      isValid = false;
    }

    setManualSaleErrors(newErrors);

    if (isValid) {
      const generatedHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const currentPrice = PRICES[manualSaleData.type as keyof typeof PRICES];
      const sale = {
        hash: generatedHash,
        name: manualSaleData.name,
        whatsapp: manualSaleData.whatsapp.replace(/\D/g, ''),
        cpf: manualSaleData.cpf.replace(/\D/g, ''),
        type: manualSaleData.type,
        qty: manualSaleData.qty,
        cups: (manualSaleData.type === 'individual' ? 1 : 2) * manualSaleData.qty,
        wristbands: (manualSaleData.type === 'individual' ? 1 : 2) * manualSaleData.qty,
        total: manualSaleData.qty * currentPrice,
        method: manualSaleData.method,
        date: new Date().toISOString(),
        status: manualSaleData.status || 'Ativa'
      };

      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });
        const result = await response.json();
        if (result.success) {
          triggerToast("Venda manual registrada com sucesso e lançada no dashboard!", "success");
          
          setManualSaleData({
            name: '',
            whatsapp: '',
            cpf: '',
            type: 'individual',
            qty: 1,
            method: 'PIX',
            status: 'Ativa'
          });
          setShowManualSaleForm(false);
          
          fetchSalesReport();
          
          // Executa a notificação via WhatsApp para ambos
          sendWhatsAppNotification(result.sale);
        } else {
          triggerToast("Erro ao registrar venda: " + result.error, "error");
        }
      } catch (err: any) {
        console.error("Erro ao registrar venda manual:", err);
        triggerToast("Erro ao conectar com o servidor.", "error");
      }
    }
  };

  const confirmDelivery = (sale: any) => {
    triggerConfirm(
      "Confirmar Entrega",
      `Confirmar entrega das pulseiras para ${sale.name}?`,
      () => {
        // Sincroniza via REST API de forma confiável
        fetch(`/api/sales/${sale.id}/deliver`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              // Atualiza o estado local imediatamente
              setSalesReport(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'Entregue' } : s));
              triggerToast("Entrega confirmada com sucesso!", "success");
              
              // Abre o link do WhatsApp para notificação
              const message = `*CONFIRMAÇÃO DE ENTREGA* ✅%0A%0AOlá *${sale.name}*!%0A%0AConfirmamos que você acaba de retirar suas pulseiras para o *Sunset 360º 3ª Edição*! 🌅✨%0A%0ATudo pronto para o evento! Nos vemos lá!%0A%0A📍 *Local:* ${EVENT_LOCATION}%0A📅 *Data:* 19 de Setembro%0A%0A📸 *Siga-nos:* https://www.instagram.com/sunset360_3edicao`;
              const waUrl = `https://api.whatsapp.com/send?phone=${sale.whatsapp}&text=${message}`;
              window.open(waUrl, '_blank');
            } else {
              triggerToast("Ocorreu um erro ao atualizar o status de entrega.", "error");
            }
          })
          .catch(err => {
            console.error("Erro ao confirmar entrega:", err);
            // Tenta enviar via socket como fallback caso a API falhe
            if (socket) {
              socket.emit('confirm_delivery', sale.id);
            }
            // Sincroniza localmente
            setSalesReport(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'Entregue' } : s));
            triggerToast("Entrega confirmada localmente.", "info");
          });
      }
    );
  };

  const activateSale = (sale: any) => {
    triggerConfirm(
      "Confirmar Pagamento",
      `Confirmar pagamento e ativar o ingresso de ${sale.name}?`,
      () => {
        // Sincroniza via REST API de forma confiável
        fetch(`/api/sales/${sale.id}/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              setSalesReport(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'Ativa' } : s));
              triggerToast("Pagamento confirmado e venda ativada com sucesso!", "success");
              
              // Executa a notificação via WhatsApp para o cliente
              const message = `*PAGAMENTO CONFIRMADO* ✅%0A%0AOlá *${sale.name}*!%0A%0AConfirmamos o recebimento do seu pagamento. Seu convite para o *Sunset 360º 3ª Edição* agora está *ATIVO* e liberado! 🌅✨%0A%0AAcesse o site com seu CPF para gerar/imprimir seu comprovante oficial em PDF e retire suas pulseiras em um dos nossos pontos de venda!%0A%0A*DETALHES DO CONVITE:*%0A👤 *Titular:* ${sale.name}%0A🎟️ *Tipo:* ${TICKET_LABELS[sale.type as keyof typeof TICKET_LABELS] || sale.type}%0A🔢 *Quantidade:* ${sale.qty} pacote(s)%0A💰 *Total:* R$ ${sale.total},00%0A%0A📅 *Data do Evento:* 19 de Setembro%0A📍 *Local:* ${EVENT_LOCATION}%0A%0A📸 *Siga-nos:* https://www.instagram.com/sunset360_3edicao`;
              const waUrl = `https://api.whatsapp.com/send?phone=${sale.whatsapp}&text=${message}`;
              window.open(waUrl, '_blank');
            } else {
              triggerToast("Ocorreu um erro ao ativar a venda.", "error");
            }
          })
          .catch(err => {
            console.error("Erro ao ativar venda:", err);
            // Fallback via socket
            if (socket) {
              socket.emit('activate_sale', sale.id);
            }
            // Sincroniza localmente
            setSalesReport(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'Ativa' } : s));
            triggerToast("Venda ativada localmente.", "info");
          });
      }
    );
  };

  const individualSalesCount = salesReport.filter(sale => sale.type === 'individual').reduce((acc, sale) => acc + sale.qty, 0);
  const casadinhoSalesCount = salesReport.filter(sale => sale.type === 'casadinho').reduce((acc, sale) => acc + sale.qty, 0);
  const totalCupsGiven = (individualSalesCount * 1) + (casadinhoSalesCount * 2);
  const totalSalesCount = individualSalesCount + casadinhoSalesCount;
  const totalRevenue = salesReport.reduce((acc, sale) => acc + sale.total, 0);
  const isPromoSoldOut = promoEnded || totalCupsGiven >= PROMO_LIMIT;

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedSales = (sales: any[]) => {
    const filtered = sales.filter(sale => {
      const matchesSearch = sale.name.toLowerCase().includes(adminSearch.toLowerCase()) || 
                           sale.status.toLowerCase().includes(adminSearch.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || sale.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleExportCSV = () => {
    if (salesReport.length === 0) {
      triggerToast('Não há dados para exportar.', 'info');
      return;
    }

    const headers = ['Data', 'Nome', 'WhatsApp', 'CPF', 'Tipo', 'Total (R$)', 'Status'];
    const csvRows = salesReport.map(sale => [
      sale.date,
      `"${sale.name}"`,
      sale.whatsapp,
      sale.cpf || '',
      `"${sale.type}"`,
      sale.total,
      `"${sale.status}"`
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_sunset360_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Header = () => (
    <header className="bg-black border-b border-orange-500/30 p-4 sticky top-0 z-50 flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { window.history.pushState({}, '', '/'); setView('home'); }}>
        <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-600/20 transition-transform active:scale-90">
          <Ticket className="text-white" size={24} />
        </div>
        <div className="flex flex-col -space-y-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tighter">Vendas bilhetes</span>
          <h1 className="text-lg font-bold text-white tracking-tighter uppercase italic leading-none">SUNSET <span className="text-orange-500 font-black">360º 3ª ED.</span></h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleInstall} className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-full transition-colors">
          <Download size={20} />
        </button>
        <button onClick={() => setView('admin')} className={`p-2 rounded-full transition-colors ${view === 'admin' ? 'bg-orange-500 text-black' : 'text-orange-500 hover:bg-orange-500/10'}`}>
          <LayoutDashboard size={20} />
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500 selection:text-black">
      {/* CENTRAL DE NOTIFICAÇÕES REAL-TIME (TOASTS) */}
      <div className="fixed top-4 right-4 z-[9999] pointer-events-none flex flex-col gap-3 max-w-[340px] w-full">
        <AnimatePresence>
          {adminNotifications.map((noti) => (
            <motion.div
              key={noti.notifId}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-neutral-900 border border-orange-500 rounded-2xl p-4 shadow-2xl flex gap-3 relative overflow-hidden backdrop-blur-md"
            >
              <div className="absolute top-0 right-0 p-2 opacity-[0.03] pointer-events-none">
                <Sparkles size={60} className="text-orange-500" />
              </div>
              <div className="w-1.5 bg-orange-500 absolute top-0 left-0 bottom-0"></div>
              <div className="flex-1 space-y-2 ml-1 text-left">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 bg-orange-500/15 px-2 py-0.5 rounded-full text-[8px] text-orange-400 font-black uppercase tracking-wider italic">
                      <Sparkles size={9} className="animate-pulse" /> NOVA VENDA REALIZADA
                    </span>
                    <p className="text-xs font-black text-white italic uppercase truncate w-[220px]">{noti.name}</p>
                  </div>
                  <button 
                    onClick={() => dismissNotification(noti.notifId)}
                    className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-white transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] text-neutral-400 font-bold border-t border-neutral-800/80 pt-2 italic">
                  <div>
                    <span className="text-[7.5px] text-neutral-500 block uppercase font-black tracking-widest mb-0.5">Tipo de Convite</span>
                    <span className="text-white font-black uppercase leading-tight font-black">{TICKET_LABELS[noti.type as keyof typeof TICKET_LABELS] || noti.type}</span>
                  </div>
                  <div>
                    <span className="text-[7.5px] text-neutral-500 block uppercase font-black tracking-widest mb-0.5">Qtd / Brindes</span>
                    <span className="text-orange-400 font-black leading-tight font-black">
                      {noti.qty}x ({(noti.type === 'individual' ? 1 : 2) * noti.qty} Copos / Pulseiras)
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Header />

      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait">
          {/* TELA INICIAL (HOME) */}
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* BANNER PRINCIPAL */}
              <div className="relative rounded-3xl overflow-hidden h-72 shadow-2xl border border-neutral-800 bg-black group">
                <img 
                  src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800" 
                  alt="Ambiente Sunset" 
                  className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-center justify-between p-6">
                  <div className="flex flex-col justify-center max-w-[45%] z-10">
                    {isPromoSoldOut ? (
                      <div className="flex flex-col gap-1 mb-2">
                        <span className="bg-red-600 text-[10px] font-black px-3 py-1 rounded-full w-fit uppercase tracking-widest shadow-lg shadow-red-600/40 border border-red-400/50">Promoção Esgotada</span>
                        <span className="text-[9px] text-neutral-500 font-black uppercase italic tracking-tighter">
                          {totalCupsGiven} copos garantidos
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex flex-col gap-1">
                          <span className="bg-orange-600 text-[10px] font-bold px-3 py-1 rounded-full w-fit uppercase tracking-widest shadow-lg animate-pulse">Primeiro Lote</span>
                          <span className="text-[9px] text-orange-500 font-black uppercase italic tracking-tighter">
                            {PROMO_LIMIT - totalCupsGiven} copos restantes
                          </span>
                        </div>
                        {/* Barra de Progresso no Banner */}
                        <div className="w-full max-w-[120px] bg-neutral-800 h-1 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-orange-500 transition-all duration-1000"
                            style={{ width: `${(totalCupsGiven / PROMO_LIMIT) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex gap-2 text-[7px] font-black uppercase text-neutral-500 italic tracking-tighter">
                          <span>IND: {individualSalesCount}</span>
                          <span>CAS: {casadinhoSalesCount}</span>
                        </div>
                      </div>
                    )}
                    <h2 className="text-2xl font-black italic uppercase leading-none text-white tracking-tighter">SUNSET 360º<br/><span className="text-orange-500 italic font-black">3ª EDIÇÃO</span></h2>
                    <p className="text-[10px] text-neutral-400 mt-2 font-bold uppercase tracking-widest italic">Prepare-se para o épico.</p>
                  </div>
                  <div className="w-52 h-52 relative z-10 flex items-center justify-center">
                      <div className="absolute inset-0 bg-orange-500/20 blur-[50px] rounded-full"></div>
                      <img 
                          src={LOGO_URL} 
                          alt="Sunset 360 Logo Oficial" 
                          className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(249,115,22,0.9)] scale-110"
                          referrerPolicy="no-referrer"
                      />
                  </div>
                </div>
              </div>

              {/* CONTAGEM REGRESSIVA */}
              <div className="px-1">
                <Countdown />
              </div>

              {/* IMAGEM PROMOCIONAL */}
              <div className="px-1">
                <div className="rounded-3xl overflow-hidden border border-neutral-800 bg-black shadow-2xl">
                  <img 
                    src="https://i.postimg.cc/FzrD9CDv/Whats-App-Image-2026-06-26-at-21-23-57.jpg" 
                    alt="Arte Sunset Story" 
                    className="w-full h-auto block"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* PROMOÇÃO COPO PERSONALIZADO */}
              {!isPromoSoldOut ? (
                <div className="bg-orange-600/10 border-2 border-orange-600 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Gift size={48} className="text-orange-500 rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <Gift size={18} className="text-orange-500" />
                      <span className="text-xs font-black uppercase tracking-tighter text-orange-500 tracking-widest">Promoção de Lançamento</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-tight">
                      Os primeiros <span className="text-orange-500 underline font-black">{PROMO_LIMIT} a comprar</span> ganham um copo personalizado do evento!
                    </p>
                    <div className="flex flex-col gap-1 pt-1 border-t border-orange-500/20 font-bold italic">
                      <p className="text-[10px] uppercase text-neutral-400">• 1 Casadinho = <span className="text-white font-black">2 Copos</span></p>
                      <p className="text-[10px] uppercase text-neutral-400">• 1 Individual = <span className="text-white font-black">1 Copo</span></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900 border-2 border-neutral-800 rounded-2xl p-4 relative overflow-hidden grayscale">
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Gift size={48} className="text-white rotate-12" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} className="text-neutral-500" />
                      <span className="text-xs font-black uppercase tracking-tighter text-neutral-500 tracking-widest">Promoção Encerrada</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-400 leading-tight">
                      As vendas da promoção dos <span className="text-neutral-300 underline font-black">copos personalizados</span> esgotaram!
                    </p>
                    <div className="pt-1 border-t border-neutral-800">
                      <p className="text-[10px] uppercase text-neutral-600 italic font-bold">Agradecemos a todos que garantiram o seu brinde.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* OPÇÕES DE COMPRA NA HOME */}
              <div className="grid grid-cols-1 gap-4 pt-2">
                {['casadinho', 'individual'].map((type) => (
                  <div key={type} className="bg-neutral-900 p-5 rounded-2xl border-2 border-orange-500/30 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          {type === 'casadinho' ? <Users2 size={60} className="text-orange-500" /> : <User size={60} className="text-orange-500" />}
                      </div>
                      <div className="relative z-10">
                          <h3 className="text-xl font-black text-orange-500 mb-1 italic uppercase tracking-tight">{TICKET_LABELS[type as keyof typeof TICKET_LABELS]}</h3>
                          <p className="text-xs text-neutral-400 mb-4 font-medium">{type === 'casadinho' ? 'Para você e seu acompanhante.' : 'Bilhete único para o evento.'}</p>
                          <div className="flex justify-between items-end">
                              <span className="text-2xl font-bold text-white tracking-tighter italic font-black">R$ {PRICES[type as keyof typeof PRICES]},00</span>
                              <button onClick={() => startPurchase(type)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-orange-600/20">
                                  Comprar <ChevronRight size={16} />
                              </button>
                          </div>
                      </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setView('my_tickets')} className="w-full bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between group hover:border-orange-500 transition-all shadow-lg">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-orange-500/10 rounded-lg">
                        <ClipboardList className="text-orange-500" size={20} />
                     </div>
                     <div className="text-left leading-tight">
                        <p className="text-white font-bold text-sm uppercase italic">Meus Convites</p>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tighter italic">Verifique suas pulseiras ativas</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-neutral-700 group-hover:text-orange-500" />
              </button>

              {/* LOCALIZAÇÃO (MAPA) NO FINAL */}
              <div className="pt-4 space-y-4">
                 <div className="flex items-center gap-2 px-2">
                    <MapIcon size={18} className="text-orange-500" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Localização do Evento</h3>
                 </div>
                 
                 <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="relative h-40 w-full bg-neutral-800">
                        <img 
                          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800" 
                          alt="Mapa Representativo" 
                          className="w-full h-full object-cover opacity-50"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="bg-orange-600 p-3 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.5)] animate-bounce">
                              <Navigation size={24} className="text-white fill-white" />
                           </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black p-4">
                           <p className="text-xs font-black text-white uppercase italic">Coliseu - Sunset 360º</p>
                           <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">Toque para abrir no Google Maps</p>
                        </div>
                    </div>
                    <div className="p-4">
                       <button 
                          onClick={() => window.open(MAP_URL, '_blank')}
                          className="w-full bg-neutral-950 border border-orange-500/30 hover:border-orange-500 text-orange-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest italic"
                       >
                          ABRIR MAPA COMPLETO
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {/* TELA DE CHECKOUT */}
          {view === 'buy' && (
            <motion.div 
              key="buy"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <button onClick={() => setView('home')} className="flex items-center gap-2 text-orange-500 font-medium text-sm font-bold"><ArrowLeft size={18} /> Voltar</button>
              <div className="font-bold">
                <h2 className="text-2xl font-bold uppercase italic tracking-tighter text-white font-black leading-tight">Reserva de Bilhete</h2>
                <p className="text-neutral-400 text-sm italic font-medium tracking-tight">Sunset 360º - 3ª Edição</p>
                <p className="text-neutral-400 text-sm">Convite: <span className="text-orange-500 font-bold uppercase italic">{TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS]}</span></p>
              </div>
              <div className="space-y-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-xl">
                  <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-2 tracking-widest font-black italic">Dados do Titular</label>
                  <div className="space-y-3">
                      <div>
                        <input 
                          type="text" value={userData.name}
                          onChange={handleNameChange}
                          className={`w-full bg-neutral-950 border ${errors.name ? 'border-red-500' : 'border-neutral-800'} rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-white font-bold italic`}
                          placeholder="Nome Completo"
                        />
                        {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold italic uppercase tracking-tighter">{errors.name}</p>}
                      </div>
                      <div>
                        <input 
                          type="tel" value={userData.whatsapp}
                          onChange={handleWhatsAppChange}
                          className={`w-full bg-neutral-950 border ${errors.whatsapp ? 'border-red-500' : 'border-neutral-800'} rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-white font-bold italic`}
                          placeholder="WhatsApp (Ex: 64 99999-9999)"
                        />
                        {errors.whatsapp && <p className="text-red-500 text-[10px] mt-1 font-bold italic uppercase tracking-tighter">{errors.whatsapp}</p>}
                      </div>
                      <div>
                        <input 
                          type="tel" value={userData.cpf}
                          onChange={handleCPFChange}
                          className={`w-full bg-neutral-950 border ${errors.cpf ? 'border-red-500' : 'border-neutral-800'} rounded-lg p-3 text-sm focus:border-orange-500 outline-none text-white font-bold italic`}
                          placeholder="CPF (Ex: 000.000.000-00)"
                        />
                        {errors.cpf && <p className="text-red-500 text-[10px] mt-1 font-bold italic uppercase tracking-tighter">{errors.cpf}</p>}
                      </div>
                  </div>
                </div>
                <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div>
                      <span className="block font-bold text-white uppercase italic text-sm tracking-tight">Quantidade</span>
                      <span className="text-[10px] text-neutral-500 uppercase font-black italic tracking-tighter leading-none">Pacotes {TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setTicketsCount(Math.max(1, ticketsCount - 1))} className="w-8 h-8 rounded-full border border-neutral-700 flex items-center justify-center text-neutral-400 hover:border-orange-500 transition-all font-bold text-white leading-none">-</button>
                    <span className="text-xl font-black text-white italic">{ticketsCount}</span>
                    <button onClick={() => setTicketsCount(ticketsCount + 1)} className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold shadow-lg shadow-orange-500/20">+</button>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-neutral-400 uppercase text-[10px] font-black tracking-widest">Total Geral:</span>
                    <span className="text-3xl font-black text-orange-500 italic">R$ {ticketsCount * currentPrice},00</span>
                  </div>
                  <button onClick={handlePurchase} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-xl uppercase tracking-widest text-sm transition-transform active:scale-95 italic">IR PARA O PAGAMENTO</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TELA DE PAGAMENTO (PIX) */}
          {view === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6 italic font-bold"
            >
              <h2 className="text-2xl font-bold uppercase italic tracking-tighter text-white font-black leading-tight">PAGAMENTO PIX</h2>
              <div className="space-y-4">
                <div className="bg-neutral-900 p-6 rounded-2xl border-2 border-orange-500 shadow-2xl shadow-orange-500/10 text-center">
                      <div className="bg-orange-500/10 p-3 rounded-full w-fit mx-auto mb-4 shadow-inner">
                          <Smartphone size={32} className="text-orange-500" />
                      </div>
                      <h3 className="font-bold text-white uppercase tracking-tight font-black mb-1 leading-none italic">PIX COPIA E COLA</h3>
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest mb-4 italic leading-none">Chave CNPJ do organizador</p>
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4 font-bold">
                          <span className="text-orange-500 font-mono text-lg font-black block truncate italic">{PIX_KEY}</span>
                          <button onClick={copyToClipboard} className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 font-black uppercase text-xs transition-all ${copied ? 'bg-green-600 text-white shadow-green-900/20' : 'bg-neutral-800 text-white hover:bg-neutral-700 active:scale-95 shadow-lg'}`}>
                              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                              {copied ? 'CHAVE COPIADA!' : 'COPIAR CHAVE PIX'}
                          </button>
                      </div>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-center">
                   <p className="text-[10px] text-neutral-500 font-bold leading-relaxed">
                     Realize o pagamento e finalize o pedido. <br/>
                     <span className="text-orange-500 uppercase font-black">O comprovante será enviado na conversa do WhatsApp.</span>
                   </p>
                </div>
                <button onClick={() => confirmPayment('pix')} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest shadow-lg italic shadow-orange-600/20 active:scale-95">
                  FINALIZAR PEDIDO
                </button>
              </div>
            </motion.div>
          )}

          {/* TELA DE SUCESSO */}
          {view === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-6 space-y-6 leading-tight font-bold italic"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 ring-4 ring-green-500/10">
                  <CheckCircle2 size={40} className="text-white" />
                </div>
              </div>
              <div className="px-4">
                <h2 className="text-3xl font-black mb-2 italic uppercase tracking-tighter text-white font-black">RESERVA ATIVA!</h2>
                <p className="text-neutral-400 text-sm leading-relaxed font-bold italic">A sua reserva para o **Sunset 360º** já está confirmada.</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex flex-col gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-orange-500 shrink-0" size={20} />
                    <div className="space-y-1">
                        <p className="text-[11px] text-white font-black uppercase tracking-tight italic">Próximo Passo!</p>
                        <p className="text-[10px] text-neutral-400 font-bold leading-tight">
                            Clique no botão abaixo para abrir o WhatsApp. <span className="text-orange-500 font-black">Anexe seu comprovante</span> na conversa para validação.
                        </p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-orange-500/20 space-y-2">
                    <p className="text-[10px] text-white font-black uppercase italic tracking-tighter">Pontos de Venda e Retirada (Até dia 10/09):</p>
                    <div className="space-y-1">
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Delivery Bebidas Geladas</p>
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Nathália Nolêto</p>
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Rogério Negrete</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-2 rounded-xl border border-orange-500/20 flex items-center gap-2">
                     <span className="text-[10px] font-black text-orange-500 italic">⚠️ IMPORTANTE:</span>
                     <span className="text-[9px] text-neutral-400 font-bold leading-tight">Retire suas pulseiras nos pontos de vendas até dia 10 de Setembro.</span>
                  </div>
              </div>
              <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 text-left relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Ticket size={48} className="text-orange-500" /></div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-orange-500 uppercase tracking-widest italic font-black"><ShoppingBag size={16} /> Resumo</h3>
                    <span className="text-[8px] bg-green-500/20 text-green-500 px-2 py-1 rounded-full font-black uppercase ring-1 ring-green-500/20">Ativa</span>
                </div>
                <div className="space-y-3 text-xs uppercase font-black tracking-tighter italic">
                  <div className="flex justify-between font-bold"><span>Comprador</span><span className="text-white truncate max-w-[150px]">{userData.name}</span></div>
                  <div className="flex justify-between font-bold"><span>Categoria</span><span className="text-orange-500">{TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS]}</span></div>
                  <div className="flex justify-between font-black text-lg text-white pt-3 border-t border-neutral-800 leading-none">
                    <span className="text-neutral-400 text-xs font-bold tracking-widest uppercase leading-none">Total Pago</span>
                    <span className="text-orange-500 italic font-black">R$ {ticketsCount * currentPrice},00</span>
                  </div>
                </div>
              </div>
              <button onClick={handleWhatsAppNotify} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-600/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 italic">
                <MessageCircle size={20} /> ENVIAR DADOS E COMPROVANTE
              </button>
              <button onClick={handleShare} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 italic">
                <Share size={20} /> COMPARTILHAR RESERVA
              </button>

              <button 
                onClick={() => setShowQRCode(!showQRCode)} 
                className="w-full bg-neutral-900 border border-neutral-800 hover:border-orange-500 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 italic"
              >
                <Smartphone size={20} /> {showQRCode ? 'OCULTAR QR CODE' : 'GERAR QR CODE'}
              </button>

              <AnimatePresence>
                {showQRCode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
                      <QRCodeSVG 
                        value={OFFICIAL_URL} 
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                      <p className="text-black text-[10px] font-black uppercase tracking-widest italic leading-none">Aponte a câmera para compartilhar</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* MEUS CONVITES ATIVOS */}
          {view === 'my_tickets' && (
            <motion.div 
              key="my_tickets"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="space-y-6 font-bold"
            >
               <div className="flex items-center gap-2 mb-2">
                 <button onClick={() => setView('home')} className="p-1 hover:bg-neutral-800 rounded-full text-orange-500 transition-colors"><ArrowLeft size={20}/></button>
                 <h2 className="text-2xl font-bold italic uppercase tracking-tighter text-white font-black leading-tight">Meus Convites</h2>
              </div>
              {myTickets.length === 0 ? (
                 <div className="bg-neutral-900 p-10 rounded-3xl border border-neutral-800 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-600 shadow-inner"><Search size={32} /></div>
                    <div className="space-y-1">
                      <p className="font-bold text-white uppercase italic font-black leading-tight">Nenhuma compra ativa encontrada</p>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-tighter font-bold">Finalize um pedido para visualizar aqui.</p>
                    </div>
                    <button onClick={() => setView('home')} className="bg-orange-600 text-white text-[10px] font-black py-2 px-8 rounded-full uppercase tracking-widest italic shadow-lg shadow-orange-600/20">COMPRAR AGORA</button>
                 </div>
              ) : (
                 <div className="space-y-6">
                   <Countdown />
                   
                   <div className="space-y-4">
                     {myTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-neutral-900 p-5 rounded-2xl border-2 border-green-500/30 relative overflow-hidden shadow-2xl group">
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-full border border-green-500/30">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-[8px] text-green-500 font-black uppercase tracking-widest leading-none font-bold">Ativa</span>
                                </div>
                                <span className="text-[7px] text-neutral-500 font-black uppercase italic tracking-tighter">
                                  ID: #{ticket.id.toString().slice(-6)}
                                </span>
                            </div>
                            <div className="absolute top-10 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Ticket size={100} className="text-white rotate-12" /></div>
                            <div className="relative z-10 space-y-4 font-bold">
                                <div>
                                  <h3 className="text-xl font-black text-white italic uppercase leading-tight pr-20">{TICKET_LABELS[ticket.type as keyof typeof TICKET_LABELS]}</h3>
                                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest italic leading-none">Sunset 360º 3ª Edição</p>
                                  
                                  {/* Alerta de Retirada com cor e animações dinâmicas */}
                                  {(() => {
                                    const deadlineInfo = getDeadlineStatus();
                                    return (
                                      <div className={`${deadlineInfo.colorClass} mt-2.5 flex items-center gap-1.5`}>
                                        <AlertCircle size={11} className={deadlineInfo.iconClass} />
                                        <span>{deadlineInfo.label}</span>
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 italic">
                                    <div>
                                      <span className="text-[9px] text-neutral-500 uppercase font-black block mb-0.5 tracking-widest">Titular</span>
                                      <span className="text-xs text-white font-black uppercase truncate block leading-none">{ticket.name}</span>
                                      {ticket.cpf && (
                                        <span className="text-[7.5px] text-neutral-400 font-mono block mt-1 tracking-tight">CPF: {formatCPF(ticket.cpf)}</span>
                                      )}
                                    </div>
                                    <div><span className="text-[9px] text-neutral-500 uppercase font-black block mb-0.5 tracking-widest">Bilhetes</span><span className="text-xs text-white font-black leading-none">{ticket.qty} Unidade(s)</span></div>
                                </div>

                                <div className="border-t border-neutral-800/60 pt-3 flex flex-col gap-2">
                                  {/* Canvas oculto para extração de imagem no PDF */}
                                  <div style={{ display: "none" }}>
                                    <QRCodeCanvas
                                      id={`qr-canvas-${ticket.id}`}
                                      value={`${OFFICIAL_URL}?ticket=${ticket.hash}`}
                                      size={256}
                                      level="H"
                                      includeMargin={true}
                                    />
                                  </div>
                                  
                                  <button
                                    onClick={() => generateTicketPDF(ticket)}
                                    className="w-full bg-neutral-950 border border-neutral-800 hover:border-orange-500 text-neutral-300 hover:text-white font-black py-2.5 rounded-xl text-[10px] tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Download size={14} className="text-orange-500" />
                                    <span>Baixar Ingresso PDF</span>
                                  </button>
                                </div>
                            </div>
                        </div>
                     ))}
                   </div>
                 </div>
              )}
            </motion.div>
          )}

          {/* DASHBOARD ADMIN */}
          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 font-bold italic"
            >
               {!isAdminAuthenticated ? (
                 <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black flex items-center gap-2 italic uppercase tracking-tighter text-white leading-tight font-bold"><LayoutDashboard className="text-orange-500" /> ACESSO RESTRITO</h2>
                      <button onClick={() => setView('home')} className="text-[10px] uppercase font-black text-neutral-600 bg-neutral-900 px-3 py-1 rounded-full hover:text-white transition-all italic shadow-inner font-bold">Voltar</button>
                    </div>
                    
                    <form onSubmit={handleAdminLogin} className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 shadow-2xl space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-black text-neutral-500 tracking-widest italic">Login</label>
                        <input 
                          type="text" 
                          value={adminCredentials.login}
                          onChange={(e) => setAdminCredentials({...adminCredentials, login: e.target.value})}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm focus:border-orange-500 outline-none text-white font-bold italic"
                          placeholder="Usuário"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] uppercase font-black text-neutral-500 tracking-widest italic">Senha</label>
                        <input 
                          type="password" 
                          value={adminCredentials.password}
                          onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm focus:border-orange-500 outline-none text-white font-bold italic"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      
                      {loginError && (
                        <p className="text-red-500 text-[10px] font-black uppercase italic text-center">{loginError}</p>
                      )}
                      
                      <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-xl uppercase tracking-widest text-sm transition-transform active:scale-95 italic mt-2">
                        ENTRAR NO PAINEL
                      </button>

                      <div className="text-center">
                        <button 
                          type="button"
                          onClick={() => triggerToast('Funcionalidade de recuperação de senha não implementada. Entre em contato com o suporte técnico.', 'info')}
                          className="text-[10px] text-neutral-500 hover:text-orange-500 uppercase font-black tracking-widest italic transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    </form>
                 </div>
               ) : (
                 <>
                   <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black flex items-center gap-2 italic uppercase tracking-tighter text-white leading-tight font-bold"><LayoutDashboard className="text-orange-500" /> DASHBOARD ADMIN</h2>
                      <div className="flex gap-2">
                        <button onClick={handleAdminLogout} className="text-[10px] uppercase font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full hover:bg-red-500/20 transition-all italic font-bold">Sair</button>
                        <button onClick={() => setView('home')} className="text-[10px] uppercase font-black text-neutral-600 bg-neutral-900 px-3 py-1 rounded-full hover:text-white transition-all italic shadow-inner font-bold">Fechar</button>
                       </div>
                    </div>
                    {/* MONITOR DE VENDAS & CONTROLES REAL-TIME */}
                    <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800/80 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden backdrop-blur-md text-left mb-4">
                      <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                        <Bell size={44} className="text-orange-500" />
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="w-9 h-9 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 shrink-0 shadow-inner">
                          <span className="relative flex h-3 w-3 flex-none">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-neutral-500 uppercase font-black tracking-widest italic leading-none">Monitoramento Ativo</p>
                          <h4 className="text-xs font-black text-white italic uppercase tracking-tighter leading-none">Vendas em Tempo Real</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button 
                          onClick={() => setEnableNotificationSound(!enableNotificationSound)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[9px] uppercase italic transition-all active:scale-95 ${
                            enableNotificationSound 
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20' 
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {enableNotificationSound ? <Volume2 size={11} /> : <VolumeX size={11} />}
                          <span>Som ({enableNotificationSound ? 'Ativo' : 'Mudo'})</span>
                        </button>
                        
                        <button 
                          onClick={triggerTestNotification}
                          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-black text-[9px] uppercase italic px-3 py-1.5 rounded-xl shadow-lg border border-neutral-700 transition-all active:scale-95 flex items-center gap-1.5 text-nowrap"
                        >
                          <Sparkles size={11} className="animate-pulse" />
                          <span>Simular Venda</span>
                        </button>

                        <button 
                          onClick={() => setShowManualSaleForm(!showManualSaleForm)}
                          className="bg-orange-600 hover:bg-orange-700 text-white font-black text-[9px] uppercase italic px-3 py-1.5 rounded-xl shadow-lg shadow-orange-600/10 transition-all active:scale-95 flex items-center gap-1.5 text-nowrap"
                        >
                          <PlusCircle size={11} className="animate-pulse" />
                          <span>Registrar Venda Manual</span>
                        </button>
                      </div>
                    </div>

                    {showManualSaleForm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl space-y-4 text-left leading-tight mb-4"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                          <h3 className="font-bold text-sm text-orange-500 uppercase tracking-widest italic flex items-center gap-2">
                            <PlusCircle size={16} /> REGISTRAR VENDA MANUAL
                          </h3>
                          <button 
                            onClick={() => setShowManualSaleForm(false)} 
                            className="text-neutral-500 hover:text-white text-xs font-black uppercase italic"
                          >
                            Cancelar
                          </button>
                        </div>
                        
                        <form onSubmit={handleRegisterManualSale} className="grid grid-cols-1 md:grid-cols-2 gap-4 italic font-bold text-xs">
                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">Nome do Comprador</label>
                            <input 
                              type="text" 
                              required
                              value={manualSaleData.name}
                              onChange={(e) => setManualSaleData({ ...manualSaleData, name: e.target.value })}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                              placeholder="Ex: João da Silva"
                            />
                            {manualSaleErrors.name && <p className="text-red-500 text-[10px] uppercase font-black">{manualSaleErrors.name}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">WhatsApp do Comprador</label>
                            <input 
                              type="text" 
                              required
                              value={manualSaleData.whatsapp}
                              onChange={(e) => {
                                const formatted = formatWhatsApp(e.target.value);
                                setManualSaleData({ ...manualSaleData, whatsapp: formatted });
                              }}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                              placeholder="(64) 99999-9999"
                            />
                            {manualSaleErrors.whatsapp && <p className="text-red-500 text-[10px] uppercase font-black">{manualSaleErrors.whatsapp}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">CPF do Comprador</label>
                            <input 
                              type="text" 
                              required
                              value={manualSaleData.cpf}
                              onChange={(e) => {
                                const formatted = formatCPF(e.target.value);
                                setManualSaleData({ ...manualSaleData, cpf: formatted });
                              }}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                              placeholder="000.000.000-00"
                            />
                            {manualSaleErrors.cpf && <p className="text-red-500 text-[10px] uppercase font-black">{manualSaleErrors.cpf}</p>}
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">Tipo de Ingresso</label>
                            <select 
                              value={manualSaleData.type}
                              onChange={(e) => setManualSaleData({ ...manualSaleData, type: e.target.value })}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                            >
                              <option value="individual">Individual</option>
                              <option value="casadinho">Casadinho</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">Quantidade de Pacotes</label>
                            <div className="flex items-center gap-2">
                              <button 
                                type="button" 
                                onClick={() => setManualSaleData(prev => ({ ...prev, qty: Math.max(1, prev.qty - 1) }))} 
                                className="w-8 h-8 rounded border border-neutral-700 text-white flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="text-base text-white font-black">{manualSaleData.qty}</span>
                              <button 
                                type="button" 
                                onClick={() => setManualSaleData(prev => ({ ...prev, qty: prev.qty + 1 }))} 
                                className="w-8 h-8 rounded bg-orange-500 text-black flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">Forma de Pagamento</label>
                            <select 
                              value={manualSaleData.method}
                              onChange={(e) => setManualSaleData({ ...manualSaleData, method: e.target.value })}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                            >
                              <option value="PIX">PIX</option>
                              <option value="Dinheiro">Dinheiro / Retirada</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-neutral-400 uppercase tracking-widest text-[9px] block">Status Inicial</label>
                            <select 
                              value={manualSaleData.status || 'Ativa'}
                              onChange={(e) => setManualSaleData({ ...manualSaleData, status: e.target.value })}
                              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 outline-none font-bold italic"
                            >
                              <option value="Ativa">Ativa</option>
                              <option value="Pendente de Pagamento">Pendente de Pagamento</option>
                            </select>
                          </div>

                          <div className="md:col-span-2 pt-2 flex justify-between items-center">
                            <span className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">
                              Total: <span className="text-orange-500 font-black text-sm">R$ {manualSaleData.qty * PRICES[manualSaleData.type as keyof typeof PRICES]},00</span>
                            </span>
                            <button 
                              type="submit" 
                              className="bg-green-600 hover:bg-green-700 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-green-500/10 transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                            >
                              <Check size={14} /> SALVAR & NOTIFICAR WHATSAPP
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                <div className="grid grid-cols-2 gap-3 leading-tight">
                  <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-lg">
                    <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-1 italic">Vendas Totais</p>
                    <div className="flex items-center gap-2 text-white font-black leading-none italic"><Users size={16} className="text-orange-500" /><span className="text-2xl font-black leading-none">{totalSalesCount}</span></div>
                    <div className="mt-2 flex flex-col gap-0.5">
                      <p className="text-[8px] text-neutral-600 uppercase font-bold italic">Individual: {individualSalesCount}</p>
                      <p className="text-[8px] text-neutral-600 uppercase font-bold italic">Casadinho: {casadinhoSalesCount}</p>
                    </div>
                  </div>
                  <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-lg">
                    <p className="text-neutral-500 text-[10px] uppercase font-black tracking-widest mb-1 italic leading-none">Faturamento</p>
                    <div className="flex items-center gap-2 font-black leading-none italic"><DollarSign size={16} className="text-orange-500" /><span className="text-2xl font-black text-orange-500 leading-none">R$ {totalRevenue}</span></div>
                    <div className="mt-2 flex flex-col gap-0.5">
                      <p className="text-[8px] text-neutral-600 uppercase font-bold italic">Copos: {totalCupsGiven}</p>
                      <p className="text-[8px] text-neutral-600 uppercase font-bold italic">Pulseiras: {totalCupsGiven}</p>
                    </div>
                  </div>
               </div>

               {/* GRÁFICO COMPARATIVO DE COMPRAS */}
               <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl space-y-4">
                 <div className="flex justify-between items-center">
                   <div className="space-y-0.5">
                     <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest italic leading-none">Gráfico Comparativo</p>
                     <h4 className="text-xs font-black text-white italic uppercase tracking-tighter">Vendas por Tipo de Ingresso</h4>
                   </div>
                   <div className="flex gap-4 text-[9px] font-black uppercase italic">
                     <div className="flex items-center gap-1.5">
                       <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block"></span>
                       <span className="text-neutral-400">Vendas (Qtd)</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="h-44 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart 
                       data={[
                         { name: 'Individual', vendas: individualSalesCount },
                         { name: 'Casadinho', vendas: casadinhoSalesCount }
                       ]} 
                       margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                     >
                       <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                       <XAxis 
                         dataKey="name" 
                         stroke="#737373" 
                         fontSize={9} 
                         tickLine={false} 
                         axisLine={false}
                         tickFormatter={(value) => value.toUpperCase()}
                         style={{ fontWeight: '900', fontStyle: 'italic', letterSpacing: '0.05em' }}
                       />
                       <YAxis 
                         stroke="#737373" 
                         fontSize={9} 
                         tickLine={false} 
                         axisLine={false}
                         allowDecimals={false}
                         style={{ fontWeight: '900', fontStyle: 'italic' }}
                       />
                       <Tooltip 
                         cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }} 
                         contentStyle={{ 
                           backgroundColor: '#171717', 
                           borderColor: '#262626', 
                           borderRadius: '12px',
                           fontFamily: 'sans-serif',
                           fontSize: '10px',
                           fontWeight: '950',
                           fontStyle: 'italic'
                         }}
                         labelStyle={{ color: '#fff', textTransform: 'uppercase', marginBottom: '4px' }}
                         itemStyle={{ color: '#f97316' }}
                       />
                       <Bar 
                         dataKey="vendas" 
                         fill="#f97316" 
                         radius={[4, 4, 0, 0]}
                         maxBarSize={48}
                       >
                         <Cell fill="#f97316" />
                         <Cell fill="#f97316" opacity={0.85} />
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>

               {/* STATUS DA PROMOÇÃO NO ADMIN */}
               <div className={`p-4 rounded-2xl border-2 transition-all ${totalCupsGiven >= PROMO_LIMIT ? 'bg-red-500/10 border-red-500' : 'bg-orange-500/10 border-orange-500/30'}`}>
                  <div className="flex justify-between items-start mb-3">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Status da Promoção (Copos)</p>
                        <h3 className={`text-lg font-black italic uppercase leading-tight ${totalCupsGiven >= PROMO_LIMIT ? 'text-red-500' : 'text-white'}`}>
                          {totalCupsGiven >= PROMO_LIMIT ? 'META ALCANÇADA!' : `${totalCupsGiven} / ${PROMO_LIMIT} COPOS`}
                        </h3>
                     </div>
                     <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${promoEnded ? 'bg-neutral-800 text-neutral-500' : 'bg-green-500/20 text-green-500'}`}>
                        {promoEnded ? 'Encerrada' : 'Ativa'}
                     </div>
                  </div>
                  
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden mb-4">
                     <div 
                        className={`h-full transition-all duration-500 ${totalCupsGiven >= PROMO_LIMIT ? 'bg-red-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(100, (totalCupsGiven / PROMO_LIMIT) * 100)}%` }}
                     ></div>
                  </div>

                  {!promoEnded ? (
                     <button 
                        onClick={() => {
                          triggerConfirm(
                            "Encerrar Promoção",
                            "Deseja realmente encerrar a promoção de copos manualmente?",
                            () => {
                              setPromoEnded(true);
                              triggerToast("Promoção encerrada com sucesso!", "success");
                            },
                            "danger",
                            "Encerrar"
                          );
                        }}
                        className={`w-full font-black py-3 rounded-xl text-xs uppercase tracking-widest italic shadow-lg transition-all active:scale-95 ${totalCupsGiven >= PROMO_LIMIT ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20 animate-bounce' : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white hover:border-red-500/50'}`}
                     >
                        {totalCupsGiven >= PROMO_LIMIT ? 'ENCERRAR PROMOÇÃO (META ATINGIDA)' : 'FORÇAR ENCERRAMENTO MANUAL'}
                     </button>
                  ) : (
                     <div className="space-y-2">
                        <p className="text-[10px] text-neutral-500 text-center font-bold uppercase italic">A promoção foi oficialmente encerrada no site.</p>
                        <button 
                          onClick={() => setPromoEnded(false)}
                          className="w-full text-[9px] text-orange-500/50 hover:text-orange-500 uppercase font-black tracking-tighter transition-colors"
                        >
                          Reativar Promoção
                        </button>
                     </div>
                  )}
               </div>

               <div className="flex gap-2">
                 <button 
                    onClick={() => setView('admin_history')}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl shadow-xl uppercase tracking-widest text-[10px] transition-transform active:scale-95 italic flex items-center justify-center gap-2"
                 >
                    <ClipboardList size={16} /> VER HISTÓRICO COMPLETO
                 </button>
               </div>
               <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-neutral-800 bg-neutral-800/30 flex justify-between items-center sm:flex-row flex-col gap-3">
                    <h3 className="font-black text-xs uppercase tracking-widest text-neutral-400 italic leading-tight">Lista de Ativos</h3>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                      <input 
                        type="text"
                        placeholder="Buscar por nome ou status..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-[10px] focus:border-orange-500 outline-none text-white font-bold italic"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                      />
                    </div>
                    <span className="text-[10px] text-orange-500 font-black italic tracking-tighter whitespace-nowrap">{salesReport.filter(s => s.name.toLowerCase().includes(adminSearch.toLowerCase()) || s.status.toLowerCase().includes(adminSearch.toLowerCase())).length} PEDIDOS</span>
                  </div>
                  <div className="overflow-x-auto">
                    {salesReport.length === 0 ? (
                      <div className="p-10 text-center text-neutral-600 italic text-[10px] uppercase font-black">Nenhuma venda registrada ainda.</div>
                    ) : (
                      <table className="w-full text-left text-[10px] font-black uppercase tracking-tighter italic">
                        <thead><tr className="text-neutral-500 border-b border-neutral-800 uppercase bg-neutral-950/50 leading-tight">
                            <th className="p-4 italic">Titular</th><th className="p-4 text-center italic">Tipo</th><th className="p-4 text-center italic">Status</th><th className="p-4 text-right italic text-orange-500">Eliminar</th>
                        </tr></thead>
                        <tbody className="divide-y divide-neutral-800 font-bold italic">
                          {salesReport.filter(sale => 
                            sale.name.toLowerCase().includes(adminSearch.toLowerCase()) || 
                            sale.status.toLowerCase().includes(adminSearch.toLowerCase())
                          ).map((sale) => (
                            <tr key={sale.id} className="hover:bg-orange-500/5 transition-colors group">
                              <td className="p-4 font-black text-white italic truncate max-w-[80px] leading-none">{sale.name}</td>
                              <td className="p-4 text-center text-orange-500 italic font-black text-[8px] tracking-tighter leading-none">{sale.type}</td>
                              <td className="p-4 text-center italic font-black text-[8px] tracking-tighter leading-none whitespace-nowrap">
                                <span className={`${sale.status === 'Ativa' ? 'text-green-500' : sale.status === 'Entregue' ? 'text-blue-500' : 'text-neutral-500'}`}>{sale.status} {sale.status === 'Entregue' && '✅'}</span>
                              </td>
                              <td className="p-4 text-right flex justify-end gap-2">
                                {sale.status !== 'Entregue' && (
                                  <button 
                                    onClick={() => confirmDelivery(sale)} 
                                    className="p-2 text-neutral-700 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all shadow-sm"
                                    title="Confirmar Entrega"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                )}
                                <button onClick={() => deleteSale(sale.id)} className="p-2 text-neutral-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shadow-sm"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
               </div>
             </>
           )}
        </motion.div>
      )}

          {/* HISTÓRICO COMPLETO ADMIN */}
          {view === 'admin_history' && (
            <motion.div 
              key="admin_history"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6 font-bold italic"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => setView('admin')} className="p-1 hover:bg-neutral-800 rounded-full text-orange-500 transition-colors"><ArrowLeft size={20}/></button>
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight font-bold">Histórico de Vendas</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg border border-neutral-700 transition-all active:scale-95 uppercase tracking-widest italic"
                  >
                    <Download size={12} /> EXPORTAR CSV
                  </button>
                  <span className="text-[10px] text-orange-500 font-black italic tracking-tighter whitespace-nowrap bg-orange-500/10 px-3 py-1 rounded-full">{salesReport.length} REGISTROS</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-xl space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <input 
                      type="text"
                      placeholder="Buscar por nome ou status..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:border-orange-500 outline-none text-white font-bold italic"
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-neutral-500" />
                    <select 
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] focus:border-orange-500 outline-none text-white font-bold italic w-full"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="Todos">Todos os Status</option>
                      <option value="Ativa">Ativa</option>
                      <option value="Entregue">Entregue</option>
                      <option value="Pendente de Pagamento">Pendente de Pagamento</option>
                    </select>
                  </div>
                </div>

                <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] font-black uppercase tracking-tighter italic">
                      <thead>
                        <tr className="text-neutral-500 border-b border-neutral-800 uppercase bg-neutral-950/50 leading-tight">
                          <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('date')}>
                            <div className="flex items-center gap-1">Data <ArrowUpDown size={10} /></div>
                          </th>
                          <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                            <div className="flex items-center gap-1">Nome <ArrowUpDown size={10} /></div>
                          </th>
                          <th className="p-4 cursor-pointer hover:text-white transition-colors text-center" onClick={() => handleSort('type')}>
                            <div className="flex items-center justify-center gap-1">Tipo <ArrowUpDown size={10} /></div>
                          </th>
                          <th className="p-4 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('total')}>
                            <div className="flex items-center justify-end gap-1">Total <ArrowUpDown size={10} /></div>
                          </th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-right text-orange-500">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800 font-bold italic">
                        {getSortedSales(salesReport).map((sale) => (
                          <tr key={sale.id} className="hover:bg-orange-500/5 transition-colors group">
                            <td className="p-4 text-neutral-400 whitespace-nowrap text-xs font-mono">{formatPurchaseDateTime(sale)}</td>
                            <td className="p-4 font-black text-white italic truncate max-w-[100px] leading-none">
                              <div>{sale.name}</div>
                              {sale.cpf && <div className="text-[7.5px] text-neutral-500 font-mono mt-1 font-normal tracking-normal">{formatCPF(sale.cpf)}</div>}
                            </td>
                            <td className="p-4 text-center text-orange-500 italic font-black text-[8px] tracking-tighter leading-none">{sale.type}</td>
                            <td className="p-4 text-right text-white font-black">R${sale.total}</td>
                            <td className="p-4 text-center italic font-black text-[8px] tracking-tighter leading-none whitespace-nowrap">
                              <span className={`${
                                sale.status === 'Ativa' 
                                  ? 'text-green-500' 
                                  : sale.status === 'Entregue' 
                                    ? 'text-blue-500' 
                                    : sale.status === 'Pendente de Pagamento'
                                      ? 'text-amber-500'
                                      : 'text-neutral-500'
                              }`}>
                                {sale.status} {sale.status === 'Entregue' && '✅'} {sale.status === 'Pendente de Pagamento' && '⏳'}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              {sale.status === 'Pendente de Pagamento' && (
                                <button 
                                  onClick={() => activateSale(sale)} 
                                  className="p-2 text-amber-500 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                                  title="Confirmar Pagamento / Ativar Venda"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {sale.status === 'Ativa' && (
                                <button 
                                  onClick={() => confirmDelivery(sale)} 
                                  className="p-2 text-neutral-700 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                                  title="Confirmar Entrega"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              <button onClick={() => deleteSale(sale.id)} className="p-2 text-neutral-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}


          {/* TICKET VIEW (PUBLICO) */}
          {view === 'ticket_view' && viewedTicket && (
            <motion.div 
              key="ticket_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center italic font-bold"
            >
              <div className="bg-neutral-900 rounded-[40px] border border-neutral-800 p-8 shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px]"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[60px]"></div>
                
                <div className="relative space-y-4">
                  <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-orange-600/30">
                    <Ticket className="text-white" size={40} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">CONVITE DIGITAL</h2>
                    <p className="text-neutral-500 text-[10px] font-black uppercase tracking-widest">Sunset 360º - 3ª Edição</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[30px] inline-block shadow-[0_0_50px_rgba(249,115,22,0.2)] ring-8 ring-white/5 relative group">
                  <QRCodeSVG 
                    value={`${OFFICIAL_URL}?ticket=${viewedTicket.hash}`} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 backdrop-blur-sm rounded-[30px]">
                      <Maximize size={32} className="text-orange-600" />
                  </div>
                </div>

                <div className="space-y-4 text-left font-black uppercase italic tracking-tighter">
                   <div className="flex flex-col p-4 bg-black/40 rounded-2xl border border-neutral-800">
                      <span className="text-[9px] text-neutral-500 mb-1">Titular</span>
                      <span className="text-lg text-white truncate mb-1">{viewedTicket.name}</span>
                      {viewedTicket.cpf && (
                        <span className="text-[10px] text-neutral-400 font-mono">CPF: {formatCPF(viewedTicket.cpf)}</span>
                      )}
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-black/40 rounded-2xl border border-neutral-800">
                         <span className="text-[9px] text-neutral-500 mb-1">Categoria</span>
                         <span className="text-orange-500 block">{TICKET_LABELS[viewedTicket.type as keyof typeof TICKET_LABELS]}</span>
                      </div>
                      <div className="p-4 bg-black/40 rounded-2xl border border-neutral-800 text-right">
                         <span className="text-[9px] text-neutral-500 mb-1">Total Items</span>
                         <span className="text-white block">{viewedTicket.qty * (viewedTicket.type === 'individual' ? 1 : 2)} Pulseiras</span>
                      </div>
                   </div>
                </div>

                <div className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${viewedTicket.status === 'Entregue' ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30' : 'bg-green-600/20 text-green-500 border border-green-500/30'}`}>
                   {viewedTicket.status === 'Entregue' ? 'Convite já Autenticado ✅' : 'Convite Ativo • Aguardando Retirada'}
                </div>
              </div>

              <div className="text-sm text-neutral-500 font-bold px-8 leading-tight">
                Apresente este QR Code em um dos pontos de retirada para receber sua pulseira e copos.
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button 
                  onClick={() => generateTicketPDF(viewedTicket)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm transition-all active:scale-95 flex items-center justify-center gap-2 italic cursor-pointer"
                >
                  <Printer size={18} />
                  <span>Imprimir Ingresso</span>
                </button>
                <button 
                  onClick={() => { window.history.pushState({}, '', '/'); setView('home'); setViewedTicket(null); }}
                  className="flex-1 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm transition-all active:scale-95 italic cursor-pointer"
                >
                  VOLTAR AO INÍCIO
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER FIXO */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neutral-800 p-4 flex justify-around items-center max-w-md mx-auto z-40 italic shadow-2xl shadow-black font-bold">
        <button onClick={() => { window.history.pushState({}, '', '/'); setView('home'); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-orange-500 scale-110 active:scale-100 font-black' : 'text-neutral-600 hover:text-neutral-400 font-black italic'}`}>
          <Ticket size={22} /><span className="text-[9px] font-black uppercase tracking-tighter italic leading-none">Início</span>
        </button>
        <button onClick={() => setView('my_tickets')} className={`flex flex-col items-center gap-1 transition-all ${view === 'my_tickets' ? 'text-orange-500 scale-110 active:scale-100 font-black' : 'text-neutral-600 hover:text-neutral-400 font-black italic'}`}>
          <div className="relative font-bold"><ClipboardList size={22} /><span className="absolute -top-1 -right-1 bg-green-500 w-2 h-2 rounded-full animate-pulse border border-black shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span></div>
          <span className="text-[9px] font-black uppercase tracking-tighter italic text-pretty leading-none">Convites</span>
        </button>
      </nav>

      {/* Toast Customizado */}
      <AnimatePresence>
        {customToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4"
          >
            <div className={`p-4 rounded-xl border font-black italic uppercase tracking-tighter shadow-2xl flex items-center gap-3 backdrop-blur-md text-[11px] ${
              customToast.type === 'success' 
                ? 'bg-green-500/15 border-green-500/30 text-green-400' 
                : customToast.type === 'error'
                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300'
            }`}>
              <AlertCircle size={16} className="shrink-0 text-orange-500" />
              <span>{customToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação Customizado */}
      <AnimatePresence>
        {customConfirm.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl font-bold italic"
            >
              <div className="flex items-center gap-2.5 text-orange-500">
                <AlertCircle size={20} className="shrink-0 animate-pulse text-orange-500" />
                <h3 className="text-sm font-black uppercase tracking-widest">{customConfirm.title}</h3>
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed uppercase tracking-tight">{customConfirm.message}</p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCustomConfirm(prev => ({ ...prev, show: false }))}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black py-3 rounded-xl uppercase tracking-widest text-[9px] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={customConfirm.onConfirm}
                  className={`flex-1 font-black py-3 rounded-xl uppercase tracking-widest text-[9px] transition-all ${
                    customConfirm.type === 'danger' 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20'
                  }`}
                >
                  {customConfirm.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <img 
        id="pdf-logo-img" 
        src="https://i.postimg.cc/GmNCwhV0/LOGO-EVENTO-SUNSET-360-3-EDICAO.png" 
        alt="Logo PDF" 
        style={{ display: 'none' }} 
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default App;
