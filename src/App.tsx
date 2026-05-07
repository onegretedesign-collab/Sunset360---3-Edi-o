import React, { useState, useEffect } from 'react';
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
  Map as MapIcon,
  Navigation,
  Clock,
  Download,
  Share,
  ArrowUpDown,
  Filter,
  Maximize,
  QrCode,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { auth } from './firebase';

const App = () => {
  // Estados principais
  const [view, setView] = useState('home'); // home, buy, payment, success, my_tickets, admin, admin_history, scanner, ticket_view
  const [ticketType, setTicketType] = useState('individual'); // individual ou casadinho
  const [ticketsCount, setTicketsCount] = useState(1);
  const [userData, setUserData] = useState({ name: '', whatsapp: '' });
  const [errors, setErrors] = useState({ name: '', whatsapp: '' });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ login: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [scanning, setScanning] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<any>(null);
  const [scannedError, setScannedError] = useState('');
  const [viewedTicket, setViewedTicket] = useState<any>(null);
  const [currentSaleHash, setCurrentSaleHash] = useState('');

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
        alert("Para instalar, toque no menu do seu navegador e escolha 'Adicionar à tela de início'.");
    }
  };

  // Convites comprados nesta sessão
  const [myTickets, setMyTickets] = useState<any[]>([]);

  // Inicializar Socket.io
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('initial_sales', (sales) => {
      setSalesReport(sales);
    });

    newSocket.on('promo_status', (status) => {
      setPromoEnded(status);
    });

    newSocket.on('sale_added', (newSale) => {
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
      if (scannedTicket && scannedTicket.id === updatedData.id) {
        setScannedTicket((prev: any) => ({ ...prev, ...updatedData }));
      }
    });

    newSocket.on('sale_confirmed', (confirmedSale) => {
      setCurrentSaleHash(confirmedSale.hash);
    });

    newSocket.on('ticket_validated', (ticket) => {
      setScannedTicket(ticket);
      setScannedError('');
    });

    newSocket.on('ticket_invalid', () => {
      setScannedError('Convite não encontrado ou inválido.');
      setScannedTicket(null);
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

  // Função para excluir venda (Admin)
  const deleteSale = (id: number) => {
    if (socket) {
      socket.emit('delete_sale', id);
    }
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
  const handleWhatsAppNotify = () => {
    if (!currentSaleHash) {
      alert("Aguardando confirmação do servidor... tente novamente em um instante.");
      return;
    }
    const total = ticketsCount * currentPrice;
    const cups = (ticketType === 'individual' ? 1 : 2) * ticketsCount;
    const wristbands = (ticketType === 'individual' ? 1 : 2) * ticketsCount;
    const ticketLink = `${OFFICIAL_URL}?ticket=${currentSaleHash}`;
    const message = `Olá! Acabei de garantir o meu convite para o *Sunset 360º 3ª Edição* no *${EVENT_LOCATION}*! 🌅✨%0A%0A📅 *Data:* 19 de Setembro às 18 horas%0A%0A*DADOS DA COMPRA:*%0A👤 *Comprador:* ${userData.name}%0A🎟️ *Convite:* ${TICKET_LABELS[ticketType as keyof typeof TICKET_LABELS]}%0A🔢 *Quantidade:* ${ticketsCount}%0A🥤 *Copos:* ${cups}%0A🎗️ *Pulseiras:* ${wristbands}%0A💰 *Valor Total:* R$ ${total},00%0A💳 *Método:* ${paymentMethod === 'pix' ? 'PIX (Copia e Cola)' : 'Pagamento na Entrega'}%0A%0A*PONTOS DE VENDAS E RETIRADAS DE PULSEIRAS:*%0A📍 Delivery Bebidas Geladas%0A📍 Açai Tele Entregas (Vendedor: Alex ou Esposa)%0A📍 Rogério Negrete%0A%0A⚠️ *Importante:* Apresente este comprovante nos pontos de venda para retirar suas pulseiras.%0A%0A🎫 *SEU CONVITE DIGITAL (QR CODE):*%0A${ticketLink}%0A%0A🌐 *Garanta o seu também em:*%0A${OFFICIAL_URL}%0A%0A📸 *Siga nosso Instagram e compartilhe:*%0Ahttps://www.instagram.com/sunset360_3edicao?utm_source=qr&igsh=czZneG01cHlrZTI3%0A%0A*ESTOU ENVIANDO O COMPROVANTE ABAIXO:* 👇`;
    
    const waUrl = `https://api.whatsapp.com/send?phone=${ORGANIZER_WA}&text=${message}`;
    window.open(waUrl, '_blank');
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

  // Lógica de Navegação
  const startPurchase = (type: string) => {
    setTicketType(type);
    setTicketsCount(1);
    setErrors({ name: '', whatsapp: '' });
    setView('buy');
  };

  const handlePurchase = () => {
    const newErrors = { name: '', whatsapp: '' };
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

  const [generatedTicket, setGeneratedTicket] = useState<any>(null);

  const confirmPayment = async (method: string) => {
    setPaymentMethod(method);
    const saleData = {
      name: userData.name,
      whatsapp: userData.whatsapp.replace(/\D/g, ''),
      type: ticketType,
      qty: ticketsCount,
      total: ticketsCount * currentPrice,
      method: method === 'pix' ? 'PIX' : 'Retirada'
    };
    
    try {
      const response = await fetch('/api/tickets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });
      
      const result = await response.json();
      if (result.success) {
        setGeneratedTicket(result);
        setCurrentSaleHash(result.hash);
        setView('success');
      } else {
        alert(`Erro ao gerar convite: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert(`Erro de conexão com o servidor: ${error instanceof Error ? error.message : 'Verifique sua internet'}`);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCredentials.login === 'Sunset' && adminCredentials.password === '124578') {
      setIsAdminAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Credenciais inválidas. Tente novamente.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setAdminCredentials({ login: '', password: '' });
    setView('home');
  };

  const confirmDelivery = async (sale: any) => {
    if (!confirm(`Confirmar entrada de ${sale.name}?`)) return;

    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: sale.hash })
      });
      const result = await response.json();
      
      if (result.success) {
        setScannedTicket(result.ticket);
        
        // Notificação via WhatsApp
        const message = `*ENTRADA CONFIRMADA* ✅%0A%0AOlá *${sale.name}*!%0A%0AConfirmamos sua entrada no *Sunset 360º 3ª Edição*! 🌅✨%0A%0AAproveite o evento!%0A%0A📍 *Local:* ${EVENT_LOCATION}%0A📅 *Data:* 19 de Setembro`;
        
        const waUrl = `https://api.whatsapp.com/send?phone=${sale.whatsapp}&text=${message}`;
        window.open(waUrl, '_blank');
      } else {
        alert(result.error || "Erro ao validar entrada.");
      }
    } catch (err) {
      alert("Erro de conexão ao validar.");
    }
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
      alert('Não há dados para exportar.');
      return;
    }

    const headers = ['Data', 'Nome', 'WhatsApp', 'Tipo', 'Total (R$)', 'Status'];
    const csvRows = salesReport.map(sale => [
      sale.date,
      `"${sale.name}"`,
      sale.whatsapp,
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
        <button onClick={() => setView('scanner')} className={`p-2 rounded-full transition-colors ${view === 'scanner' ? 'bg-orange-500 text-black' : 'text-orange-500 hover:bg-orange-500/10'}`}>
          <Scan size={20} />
        </button>
        <button onClick={handleInstall} className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-full transition-colors">
          <Download size={20} />
        </button>
        <button onClick={() => setView('admin')} className={`p-2 rounded-full transition-colors ${view === 'admin' ? 'bg-orange-500 text-black' : 'text-orange-500 hover:bg-orange-500/10'}`}>
          <LayoutDashboard size={20} />
        </button>
      </div>
    </header>
  );

  const QRScannerComponent = () => {
    useEffect(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      const onScanSuccess = async (decodedText: string) => {
        let hash = decodedText;
        if (decodedText.includes('ticket=')) {
          hash = new URL(decodedText).searchParams.get('ticket') || decodedText;
        }
        
        try {
          const response = await fetch('/api/tickets/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash })
          });
          const result = await response.json();
          if (result.success) {
            setScannedTicket(result.ticket);
            setScannedError('');
          } else if (result.alreadyUsed) {
            setScannedTicket(result.ticket);
            setScannedError('Este convite já foi utilizado!');
          } else {
            setScannedError('Convite inválido ou não encontrado.');
          }
        } catch (err) {
          setScannedError('Erro na conexão para validar.');
        }
        scanner.clear();
      };

      scanner.render(onScanSuccess, () => {});

      return () => {
        scanner.clear().catch(e => console.log(e));
      };
    }, []);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('home'); setScannedTicket(null); setScannedError(''); }} className="p-1 hover:bg-neutral-800 rounded-full text-orange-500 transition-colors"><ArrowLeft size={20}/></button>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight font-bold">Validar Convite</h2>
        </div>
        <div className="bg-neutral-900 p-2 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl relative">
            <div id="reader" className="overflow-hidden rounded-2xl"></div>
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
                 <div className="w-60 h-60 border-2 border-orange-500/50 rounded-2xl"></div>
            </div>
        </div>
        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center italic">Posicione o QR Code no visor para autenticar</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500 selection:text-black">
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
                    src="https://i.postimg.cc/bwNcM5kp/ARTE-SUNSET-STORY.jpg" 
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
                    <p className="text-[10px] text-white font-black uppercase italic tracking-tighter">Pontos de Venda e Retirada:</p>
                    <div className="space-y-1">
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Delivery Bebidas Geladas</p>
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Açai Tele Entregas (Vendedor: Alex ou Esposa)</p>
                      <p className="text-[10px] text-neutral-400 font-bold">📍 Rogério Negrete</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-2 rounded-xl border border-orange-500/20 flex items-center gap-2">
                     <span className="text-[10px] font-black text-orange-500 italic">⚠️ IMPORTANTE:</span>
                     <span className="text-[9px] text-neutral-400 font-bold leading-tight">Apresente este comprovante para retirar suas pulseiras.</span>
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
              {generatedTicket?.imageUrl && (
                <div className="bg-neutral-900 border-2 border-orange-500 rounded-3xl p-4 space-y-4 shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="text-orange-500" size={18} />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest italic">Seu Convite Digital</span>
                  </div>
                  <img 
                    src={generatedTicket.imageUrl} 
                    alt="Seu Convite" 
                    className="w-full rounded-2xl shadow-lg border border-neutral-800"
                  />
                  <a 
                    href={generatedTicket.imageUrl} 
                    download={`ticket_sunset360_${generatedTicket.hash}.png`}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl block text-sm uppercase tracking-widest shadow-lg shadow-orange-600/20 italic"
                  >
                    BAIXAR IMAGEM DO CONVITE
                  </a>
                </div>
              )}

              <button 
                onClick={handleWhatsAppNotify} 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-600/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 italic"
              >
                <MessageCircle size={20} /> ENVIAR NO WHATSAPP
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
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 border-t border-neutral-800 pt-4 italic">
                                    <div><span className="text-[9px] text-neutral-500 uppercase font-black block mb-0.5 tracking-widest">Titular</span><span className="text-xs text-white font-black uppercase truncate block leading-none">{ticket.name}</span></div>
                                    <div><span className="text-[9px] text-neutral-500 uppercase font-black block mb-0.5 tracking-widest">Bilhetes</span><span className="text-xs text-white font-black leading-none">{ticket.qty} Unidade(s)</span></div>
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
                          onClick={() => alert('Funcionalidade de recuperação de senha não implementada. Entre em contato com o suporte técnico.')}
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
                          if (confirm('Deseja realmente encerrar a promoção de copos manualmente?')) {
                            setPromoEnded(true);
                          }
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
                      <option value="Pendente">Pendente</option>
                      <option value="Cancelada">Cancelada</option>
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
                            <td className="p-4 text-neutral-400 whitespace-nowrap">{sale.date}</td>
                            <td className="p-4 font-black text-white italic truncate max-w-[100px] leading-none">{sale.name}</td>
                            <td className="p-4 text-center text-orange-500 italic font-black text-[8px] tracking-tighter leading-none">{sale.type}</td>
                            <td className="p-4 text-right text-white font-black">R${sale.total}</td>
                            <td className="p-4 text-center italic font-black text-[8px] tracking-tighter leading-none whitespace-nowrap">
                              <span className={`${sale.status === 'Ativa' ? 'text-green-500' : sale.status === 'Entregue' ? 'text-blue-500' : 'text-neutral-500'}`}>{sale.status} {sale.status === 'Entregue' && '✅'}</span>
                            </td>
                            <td className="p-4 text-right flex justify-end gap-2">
                              {sale.status !== 'Entregue' && (
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
          {/* SCANNER VIEW */}
          {view === 'scanner' && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {!scannedTicket && !scannedError && <QRScannerComponent />}

              {scannedError && (
                <div className="bg-red-500/10 border-2 border-red-500 rounded-3xl p-8 text-center space-y-4">
                  <div className="bg-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
                    <AlertCircle size={32} className="text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">ERRO NA VALIDAÇÃO</h3>
                    <p className="text-neutral-400 text-sm font-bold uppercase italic">{scannedError}</p>
                  </div>
                  <button onClick={() => { setScannedError(''); setScannedTicket(null); }} className="w-full bg-neutral-800 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs italic">TENTAR NOVAMENTE</button>
                </div>
              )}

              {scannedTicket && (
                <div className="bg-neutral-900 border-2 border-orange-500 rounded-3xl overflow-hidden shadow-2xl relative">
                  <div className="bg-orange-600 p-6 text-center space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><QrCode size={64} className="text-white" /></div>
                    <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                      <CheckCircle2 size={24} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase italic tracking-tighter text-white font-black leading-tight">CONVITE IDENTIFICADO</h3>
                    <span className="bg-white px-3 py-1 rounded-full text-orange-600 font-black text-[10px] uppercase tracking-widest italic">{scannedTicket.status}</span>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="space-y-4 font-black uppercase italic tracking-tighter">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-500 mb-1">Comprador</span>
                        <span className="text-xl text-white underline decoration-orange-500/50 decoration-2 underline-offset-4">{scannedTicket.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-neutral-500 mb-1">Tipo</span>
                          <span className="text-orange-500">{TICKET_LABELS[scannedTicket.type as keyof typeof TICKET_LABELS]}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-neutral-500 mb-1">Quantidade</span>
                          <span className="text-white">{scannedTicket.qty} Pacote(s)</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-neutral-500 mb-1">Copos Brinde</span>
                          <span className="text-white">{scannedTicket.qty * (scannedTicket.type === 'individual' ? 1 : 2)} UNIDADES</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-neutral-500 mb-1">Pulseiras</span>
                          <span className="text-white font-black text-lg">{scannedTicket.qty * (scannedTicket.type === 'individual' ? 1 : 2)} UN</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {scannedTicket.status !== 'Entregue' ? (
                        <button 
                          onClick={() => confirmDelivery(scannedTicket)} 
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-green-600/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-95 italic"
                        >
                          <CheckCircle2 size={24} /> CONFIRMAR ENTREGA
                        </button>
                      ) : (
                        <div className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-500 font-black py-5 rounded-2xl text-sm flex items-center justify-center gap-2 uppercase italic">
                           ENTREGA JÁ REALIZADA ✅
                        </div>
                      )}
                      <button onClick={() => { setScannedTicket(null); setScannedError(''); }} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black py-4 rounded-xl uppercase tracking-widest text-xs italic transition-all">SCANEAR OUTRO</button>
                    </div>
                  </div>
                </div>
              )}
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
                      <span className="text-lg text-white truncate">{viewedTicket.name}</span>
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

                <div className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${viewedTicket.checkedIn ? 'bg-blue-600/20 text-blue-500 border border-blue-500/30' : 'bg-green-600/20 text-green-500 border border-green-500/30'}`}>
                   {viewedTicket.checkedIn ? 'Convite já Utilizado (Check-in Realizado) ✅' : 'Convite Ativo • Aguardando Check-in'}
                </div>
              </div>

              <div className="text-sm text-neutral-500 font-bold px-8 leading-tight">
                Apresente este QR Code em um dos pontos de retirada para receber sua pulseira e copos.
              </div>
              
              <button 
                onClick={() => { window.history.pushState({}, '', '/'); setView('home'); setViewedTicket(null); }}
                className="w-full bg-neutral-900 border border-neutral-800 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-sm transition-all active:scale-95 italic"
              >
                VOLTAR AO INÍCIO
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER FIXO */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neutral-800 p-4 flex justify-around items-center max-w-md mx-auto z-40 italic shadow-2xl shadow-black font-bold">
        <button onClick={() => { window.history.pushState({}, '', '/'); setView('home'); }} className={`flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-orange-500 scale-110 active:scale-100 font-black' : 'text-neutral-600 hover:text-neutral-400 font-black italic'}`}>
          <Ticket size={22} /><span className="text-[9px] font-black uppercase tracking-tighter italic leading-none">Início</span>
        </button>
        <button onClick={() => setView('scanner')} className={`flex flex-col items-center gap-1 transition-all ${view === 'scanner' ? 'text-orange-500 scale-110 active:scale-100 font-black' : 'text-neutral-600 hover:text-neutral-400 font-black italic'}`}>
          <Scan size={22} /><span className="text-[9px] font-black uppercase tracking-tighter italic leading-none">Scanner</span>
        </button>
        <button onClick={() => setView('my_tickets')} className={`flex flex-col items-center gap-1 transition-all ${view === 'my_tickets' ? 'text-orange-500 scale-110 active:scale-100 font-black' : 'text-neutral-600 hover:text-neutral-400 font-black italic'}`}>
          <div className="relative font-bold"><ClipboardList size={22} /><span className="absolute -top-1 -right-1 bg-green-500 w-2 h-2 rounded-full animate-pulse border border-black shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span></div>
          <span className="text-[9px] font-black uppercase tracking-tighter italic text-pretty leading-none">Convites</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
