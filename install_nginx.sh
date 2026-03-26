#!/bin/bash
# Download and install static nginx binary for CentOS 7
cd /tmp
curl -sLO https://nginx.org/download/nginx-1.24.0.tar.gz
tar -xzf nginx-1.24.0.tar.gz
cd nginx-1.24.0

# Build with minimal dependencies
yum install -y pcre-devel zlib-devel openssl-devel gcc make 2>&1 | tail -3
./configure --prefix=/usr/local/nginx --with-http_ssl_module --with-http_gzip_static_module 2>&1 | tail -5
make -j$(nproc) 2>&1 | tail -3
make install 2>&1 | tail -3

# Create systemd service
cat > /usr/lib/systemd/system/nginx.service << 'EOF'
[Unit]
Description=The NGINX HTTP and reverse proxy server
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/usr/local/nginx/logs/nginx.pid
ExecStartPre=/usr/local/nginx/sbin/nginx -t
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
/usr/local/nginx/sbin/nginx -v
echo "NGINX_INSTALL_DONE"
