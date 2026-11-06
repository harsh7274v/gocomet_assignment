import React, { useEffect, useRef } from 'react';

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label?: string;
  isHub?: boolean;
}

interface CargoPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
}

export const LogisticsCanvasMotion: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener('resize', handleResize);

    // Mouse coordinates
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 160,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const hubLabels = [
      'BOM • Nhava Sheva',
      'DEL • NCR Inland Port',
      'SIN • Singapore Hub',
      'RTM • Rotterdam Port',
      'DXB • Jebel Ali',
      'SHA • Shanghai Terminal',
      'JFK • New York Cargo',
      'HAM • Hamburg Dock',
    ];

    let nodes: NodePoint[] = [];
    let packets: CargoPacket[] = [];

    const initNodes = () => {
      nodes = [];
      packets = [];

      const nodeCount = Math.min(38, Math.max(20, Math.floor((width * height) / 35000)));

      for (let i = 0; i < nodeCount; i++) {
        const isHub = i < hubLabels.length;
        nodes.push({
          x: Math.random() * (width - 100) + 50,
          y: Math.random() * (height - 100) + 50,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: isHub ? 3.5 : 2,
          label: isHub ? hubLabels[i] : undefined,
          isHub,
        });
      }

      // Initialize cargo packet routes
      for (let p = 0; p < 18; p++) {
        const from = Math.floor(Math.random() * nodes.length);
        let to = Math.floor(Math.random() * nodes.length);
        while (to === from) {
          to = Math.floor(Math.random() * nodes.length);
        }
        packets.push({
          fromNode: from,
          toNode: to,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
        });
      }
    };

    initNodes();

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle background grid
      const gridSize = 48;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw node connections
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Move node
        node.x += node.vx;
        node.y += node.vy;

        // Bounce from boundaries
        if (node.x <= 20 || node.x >= width - 20) node.vx *= -1;
        if (node.y <= 20 || node.y >= height - 20) node.vy *= -1;

        // Connect with other nodes within distance
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 170;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22;
            ctx.strokeStyle = `rgba(30, 35, 45, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }

        // Mouse magnetic connection
        const mdx = mouse.x - node.x;
        const mdy = mouse.y - node.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < mouse.radius) {
          const mAlpha = (1 - mdist / mouse.radius) * 0.5;
          ctx.strokeStyle = `rgba(0, 0, 0, ${mAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Gentle pull toward mouse
          node.x += (mdx / mdist) * 0.2;
          node.y += (mdy / mdist) * 0.2;
        }

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isHub ? '#111111' : 'rgba(80, 90, 105, 0.45)';
        ctx.fill();

        if (node.isHub) {
          // Radar pulse ring
          const pulse = (Date.now() / 1200 + i) % 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + pulse * 14, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 0, 0, ${(1 - pulse) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Hub Tag label
          if (node.label && width > 768) {
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(50, 55, 65, 0.7)';
            ctx.fillText(node.label, node.x + 8, node.y + 3);
          }
        }
      }

      // Draw moving cargo packets
      for (const pkt of packets) {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          pkt.progress = 0;
          pkt.fromNode = Math.floor(Math.random() * nodes.length);
          let to = Math.floor(Math.random() * nodes.length);
          while (to === pkt.fromNode) {
            to = Math.floor(Math.random() * nodes.length);
          }
          pkt.toNode = to;
        }

        const from = nodes[pkt.fromNode];
        const to = nodes[pkt.toNode];
        if (from && to) {
          const px = from.x + (to.x - from.x) * pkt.progress;
          const py = from.y + (to.y - from.y) * pkt.progress;

          // Cargo beacon
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0; // Reset blur
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-70"
      style={{ display: 'block' }}
    />
  );
};

